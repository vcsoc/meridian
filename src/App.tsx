import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bike, BusFront, Car, ChevronDown, ChevronsLeft, Clock3, Footprints, Globe2, House, Layers3, Map as MapIcon, MapPin, Moon, Pencil, Navigation, Plane, Plus, Route, Search, Settings2, Star, Sun, Tag, X } from 'lucide-react'
import WorldMap from './WorldMap'
import { exportFavorites, importFavorites } from './favorites'
import { cities, cityDate, cityTime, countries, flag, utcOffset, type City } from './data'
import { lookupAddress, type AddressSuggestion } from './geocoding'
import './styles.css'

function minutesInZone(c:City,date=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:c.tz,hour:'numeric',minute:'numeric',hour12:false}).formatToParts(date)
 return Number(parts.find(p=>p.type==='hour')?.value)%24*60+Number(parts.find(p=>p.type==='minute')?.value)
}
function browserMinutes(date=new Date()){return date.getHours()*60+date.getMinutes()}
function timeAt(city:City,date:Date){return new Intl.DateTimeFormat('en-US',{timeZone:city.tz,hour:'numeric',minute:'2-digit',hour12:true}).format(date)}
function dateAt(city:City,date:Date){return new Intl.DateTimeFormat('en-US',{timeZone:city.tz,weekday:'short',month:'short',day:'numeric'}).format(date)}
function minuteLabel(minutes:number){const hour=Math.floor(minutes/60),minute=minutes%60;return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`} 
function difference(a:City,b:City){let d=minutesInZone(b)-minutesInZone(a);if(d>720)d-=1440;if(d< -720)d+=1440;const sign=d>=0?'+':'−';d=Math.abs(d);return `${sign}${Math.floor(d/60)}h${d%60?` ${d%60}m`:''}`}
const cityKey=(city:City)=>`${city.name}|${city.country}|${city.lat}|${city.lng}`
const citySearchIndex=cities.map(city=>({city,text:`${city.name} ${city.country}`.toLocaleLowerCase()}))
const cityByKey=new Map(cities.map(city=>[cityKey(city),city]))
const zoneGroups=Array.from(cities.reduce((groups,city)=>{const offset=utcOffset(city);const group=groups.get(offset);if(group)group.push(city);else groups.set(offset,[city]);return groups},new Map<string,City[]>())).map(([offset,groupCities])=>({offset,cities:groupCities,representative:groupCities[0],namedZones:new Set(groupCities.map(city=>city.tz)).size})).sort((a,b)=>a.representative.lng-b.representative.lng)
type ContextLocation={x:number;y:number;point:City}
type SavedLocationMeta={alias:string;tags:string[];address?:string}
type SavedMetaMap=Record<string,SavedLocationMeta>
function distanceKm(a:City,b:City){const radius=6371;const lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180;const dLat=lat2-lat1,dLng=(b.lng-a.lng)*Math.PI/180;const value=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return radius*2*Math.atan2(Math.sqrt(value),Math.sqrt(1-value))}
function durationLabel(minutes:number){const rounded=Math.max(1,Math.round(minutes));return rounded<60?`${rounded} min`:`${Math.floor(rounded/60)}h ${rounded%60}m`}
function travelEstimate(base:number,factor:number,speed:number,extra=0){const distance=base*factor;return{distance:distance<10?`${distance.toFixed(1)} km`:`${Math.round(distance).toLocaleString()} km`,time:durationLabel(distance/speed*60+extra)}}
function flightEstimates(distance:number){
 const connections=distance<=3000?0:distance<=7000?1:distance<=12000?2:3
 const cruiseSpeed=820,segmentOverhead=35,averageLayover=120
 const directMinutes=distance/cruiseSpeed*60+segmentOverhead
 const itineraryMinutes=distance*(1+connections*.06)/cruiseSpeed*60+segmentOverhead*(connections+1)+averageLayover*connections
 const distanceLabel=`${Math.round(distance).toLocaleString()} km`
 return[
  {name:'Direct flight',icon:Plane,distance:`Nonstop · ${distanceLabel}`,time:durationLabel(directMinutes)},
  {name:'Total air travel',icon:Clock3,distance:connections?`${connections} connection${connections===1?'':'s'} · 2h layover`:'Nonstop itinerary',time:durationLabel(itineraryMinutes)}
 ]
}
function cityAtCoordinates(lat:number,lng:number,name='Pinned location'){const nearest=cities.reduce((best,city)=>{const rawLng=Math.abs(city.lng-lng);const dLng=Math.min(rawLng,360-rawLng);const score=(city.lat-lat)**2+dLng**2*Math.cos(lat*Math.PI/180)**2;return score<best.score?{city,score}:best},{city:cities[0],score:Infinity});return{name:`${name} near ${nearest.city.name}`,country:nearest.city.country,code:nearest.city.code,lat,lng,tz:nearest.city.tz,address:`${lat.toFixed(5)}°, ${lng.toFixed(5)}° · ${nearest.city.country}`}}
function readHome(){try{return JSON.parse(localStorage.getItem('meridian-home')||'null') as City|null}catch{return null}}
function readSavedMeta(){try{return JSON.parse(localStorage.getItem('meridian-saved-meta')||'{}') as SavedMetaMap}catch{return {}}}
function locationAddress(city:City){return city.address||`${city.name}, ${city.country}`}

export default function App(){
 const [home,setHome]=useState<City|null>(()=>readHome());const [detectedLocation,setDetectedLocation]=useState<City|null>(null)
 const [selected,setSelected]=useState<City>(()=>readHome()||cities[0]);const [compare,setCompare]=useState<City|null>(null)
 const [query,setQuery]=useState('');const [addressSuggestions,setAddressSuggestions]=useState<AddressSuggestion[]>([]);const [lookupOpen,setLookupOpen]=useState(false);const [lookupLoading,setLookupLoading]=useState(false);const [brightness,setBrightness]=useState(100);const [,setZoom]=useState(.16)
 const [viewMode,setViewMode]=useState<'satellite'|'map'|'street'>('satellite');const [showCities,setShowCities]=useState(false);const [showZones,setShowZones]=useState(true);const [sidebarCollapsed,setSidebarCollapsed]=useState(false)
 const [tab,setTab]=useState<'places'|'favorites'|'zones'>('places');const [expanded,setExpanded]=useState<string[]>([]);const [,tick]=useState(0)
 const [showStreetNames,setShowStreetNames]=useState(true)
 const [sliderMinute,setSliderMinute]=useState<number|null>(null)
 const [compareMode,setCompareMode]=useState(false)
 const [contextLocation,setContextLocation]=useState<ContextLocation|null>(null)
 const [tripStart,setTripStart]=useState<City|null>(null);const [tripEnd,setTripEnd]=useState<City|null>(null)
 const [favoriteIds,setFavoriteIds]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('meridian-favorites')||'[]') as string[]}catch{return []}})
 const [customFavorites,setCustomFavorites]=useState<City[]>(()=>{try{return JSON.parse(localStorage.getItem('meridian-custom-favorites')||'[]') as City[]}catch{return []}});const [savedMeta,setSavedMeta]=useState<SavedMetaMap>(()=>readSavedMeta());const [editingSaved,setEditingSaved]=useState<City|null>(null);const [aliasDraft,setAliasDraft]=useState('');const [tagsDraft,setTagsDraft]=useState('');const [locationPromptDismissed,setLocationPromptDismissed]=useState(false)
 const [transferMessage,setTransferMessage]=useState('');const [importing,setImporting]=useState(false)
 const downloadFavorites=()=>{
  const all=[...favoriteIds.map(id=>cityByKey.get(id)).filter((city):city is City=>!!city),...customFavorites]
  const unique=[...new Map(all.map(city=>[cityKey(city),city])).values()]
  const url=URL.createObjectURL(new Blob([exportFavorites(unique.map(city=>({city,meta:savedMeta[cityKey(city)]})))],{type:'application/yaml'}))
  const link=document.createElement('a');link.href=url;link.download='meridian-favourites.yaml';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
  setTransferMessage(`Exported ${unique.length} favourites.`)
 }
 const uploadFavorites=async(file:File)=>{
  setImporting(true);setTransferMessage('')
  try{
   if(file.size>5*1024*1024)throw new Error('Please choose a YAML file smaller than 5 MB.')
   const entries=importFavorites(await file.text())
   setFavoriteIds(ids=>[...new Set([...ids,...entries.filter(entry=>cityByKey.has(cityKey(entry.city))).map(entry=>cityKey(entry.city))])])
   setCustomFavorites(items=>[...new Map([...items,...entries.filter(entry=>!cityByKey.has(cityKey(entry.city))).map(entry=>entry.city)].map(city=>[cityKey(city),city])).values()])
   setSavedMeta(current=>{const next={...current};entries.forEach(({city,meta})=>{if(meta)next[cityKey(city)]=meta});return next})
   setTransferMessage(`Imported ${entries.length} favourites; existing favourites kept.`)
  }catch(error){setTransferMessage(error instanceof Error?error.message:'Could not import favourites.')}
  finally{setImporting(false)}
 }
 const detectUserLocation=useCallback(()=>{if(!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(position=>setDetectedLocation(cityAtCoordinates(position.coords.latitude,position.coords.longitude,'Current location')),()=>undefined,{enableHighAccuracy:false,timeout:8000,maximumAge:300000})},[])
 useEffect(()=>{const id=setInterval(()=>tick(v=>v+1),30000);return()=>clearInterval(id)},[])
 useEffect(()=>{localStorage.setItem('meridian-favorites',JSON.stringify(favoriteIds))},[favoriteIds])
 useEffect(()=>{localStorage.setItem('meridian-custom-favorites',JSON.stringify(customFavorites))},[customFavorites])
 useEffect(()=>{localStorage.setItem('meridian-saved-meta',JSON.stringify(savedMeta))},[savedMeta])
 useEffect(()=>{if(home)localStorage.setItem('meridian-home',JSON.stringify(home));else localStorage.removeItem('meridian-home')},[home])
 useEffect(()=>{if(!home)detectUserLocation()},[home,detectUserLocation])
 useEffect(()=>{const search=query.trim();if(search.length<3)return;const controller=new AbortController();const timer=setTimeout(async()=>{setLookupLoading(true);try{setAddressSuggestions(await lookupAddress(search,controller.signal))}catch(error){if((error as Error).name!=='AbortError')setAddressSuggestions([])}finally{if(!controller.signal.aborted)setLookupLoading(false)}},400);return()=>{clearTimeout(timer);controller.abort()}},[query])
 const onZoom=useCallback((v:number)=>setZoom(v),[])
 const onContextLocation=useCallback((lat:number,lng:number,x:number,y:number)=>{const nearest=cities.reduce((best,city)=>{const rawLng=Math.abs(city.lng-lng);const dLng=Math.min(rawLng,360-rawLng);const score=(city.lat-lat)**2+dLng**2*Math.cos(lat*Math.PI/180)**2;return score<best.score?{city,score}:best},{city:cities[0],score:Infinity});setContextLocation({x:Math.min(x,window.innerWidth-230),y:Math.min(y,window.innerHeight-235),point:{name:`Pinned near ${nearest.city.name}`,country:nearest.city.country,code:nearest.city.code,lat,lng,tz:nearest.city.tz,address:`${lat.toFixed(5)}°, ${lng.toFixed(5)}° · ${nearest.city.country}`}})},[])
 const normalizedQuery=query.trim().toLocaleLowerCase()
 const savedLocationKeys=useMemo(()=>new Set([...favoriteIds,...customFavorites.map(cityKey),...(home?[cityKey(home)]:[])]),[favoriteIds,customFavorites,home])
 const matchingMetaKeys=useMemo(()=>new Set(Object.entries(savedMeta).filter(([key,meta])=>savedLocationKeys.has(key)&&`${meta.alias} ${meta.tags.join(' ')} ${meta.address||''}`.toLocaleLowerCase().includes(normalizedQuery)).map(([key])=>key)),[savedMeta,savedLocationKeys,normalizedQuery])
 const shownCities=useMemo(()=>normalizedQuery?citySearchIndex.filter(item=>item.text.includes(normalizedQuery)||matchingMetaKeys.has(cityKey(item.city))).slice(0,150).map(item=>item.city):cities,[normalizedQuery,matchingMetaKeys])
 const citiesByCountry=useMemo(()=>{const groups=new Map<string,City[]>();shownCities.forEach(city=>{const group=groups.get(city.country);if(group)group.push(city);else groups.set(city.country,[city])});return groups},[shownCities])
 const shownCountries=useMemo(()=>countries.filter(c=>c.toLocaleLowerCase().includes(normalizedQuery)||citiesByCountry.has(c)),[normalizedQuery,citiesByCountry])
 const favoriteCities=useMemo(()=>[...favoriteIds.map(id=>cityByKey.get(id)).filter((city):city is City=>!!city),...customFavorites].filter(city=>{const meta=savedMeta[cityKey(city)];return !normalizedQuery||`${city.name} ${city.country} ${city.address||''} ${meta?.alias||''} ${meta?.tags.join(' ')||''}`.toLocaleLowerCase().includes(normalizedQuery)}),[favoriteIds,customFavorites,savedMeta,normalizedQuery])
 const isFavorite=(city:City)=>favoriteIds.includes(cityKey(city))||customFavorites.some(item=>cityKey(item)===cityKey(city))
 const toggleFavorite=(city:City)=>{const key=cityKey(city);if(cityByKey.has(key))setFavoriteIds(ids=>ids.includes(key)?ids.filter(id=>id!==key):[...ids,key]);else setCustomFavorites(items=>items.some(item=>cityKey(item)===key)?items.filter(item=>cityKey(item)!==key):[...items,city])}
 const displayName=(city:City)=>savedMeta[cityKey(city)]?.alias||city.name
 const displayAddress=(city:City)=>savedMeta[cityKey(city)]?.address||locationAddress(city)
 const beginSavedEdit=(city:City)=>{const meta=savedMeta[cityKey(city)];setEditingSaved(city);setAliasDraft(meta?.alias||'');setTagsDraft(meta?.tags.join(', ')||'')}
 const saveSavedEdit=()=>{if(!editingSaved)return;const tags=Array.from(new Set(tagsDraft.split(',').map(tag=>tag.trim()).filter(Boolean)));const key=cityKey(editingSaved);setSavedMeta(meta=>({...meta,[key]:{alias:aliasDraft.trim(),tags,address:locationAddress(editingSaved)}}));setEditingSaved(null)}
 const choose=(c:City)=>{if(compareMode){setCompare(c.name===selected.name?null:c);setCompareMode(false)}else setSelected(c)}
 const chooseAddress=(suggestion:AddressSuggestion)=>{const nearest=cities.reduce((best,city)=>{const rawLng=Math.abs(city.lng-suggestion.lng);const dLng=Math.min(rawLng,360-rawLng);const score=(city.lat-suggestion.lat)**2+dLng**2*Math.cos(suggestion.lat*Math.PI/180)**2;return score<best.score?{city,score}:best},{city:cities[0],score:Infinity});const location:City={name:suggestion.title,country:suggestion.country,code:suggestion.code,lat:suggestion.lat,lng:suggestion.lng,tz:nearest.city.tz,address:suggestion.label};choose(location);setQuery(suggestion.label);setLookupOpen(false)}
 const directDistance=tripStart&&tripEnd?distanceKm(tripStart,tripEnd):0
 const now=new Date();const homeClock=home?minutesInZone(home,now):browserMinutes(now);const chosenHomeMinute=sliderMinute??homeClock
 const sliderDate=new Date(now.getTime()+(chosenHomeMinute-homeClock)*60000)
 const selectedSliderTime=timeAt(selected,sliderDate);const selectedSliderDate=dateAt(selected,sliderDate)
 const homeLabel=home?displayName(home):'Your local time'
 const travelModes=directDistance?[...flightEstimates(directDistance),{name:'Driving',icon:Car,...travelEstimate(directDistance,1.28,72,5)},{name:'Walking',icon:Footprints,...travelEstimate(directDistance,1.1,5)},{name:'Cycling',icon:Bike,...travelEstimate(directDistance,1.16,18)},{name:'Transit',icon:BusFront,...travelEstimate(directDistance,1.2,42,15)}]:[]
 return <main className={`app-shell ${sidebarCollapsed?'sidebar-collapsed':''}`} onClick={()=>setContextLocation(null)}>
  <header>
   <div className="brand"><div className="brandmark"><Globe2 size={21}/></div><span>MERIDIAN</span><em>WORLD TIME ATLAS</em></div>
   <div className="view-switch"><button className={viewMode==='satellite'?'active':''} onClick={()=>setViewMode('satellite')}><Globe2/>Satellite</button><button className={viewMode==='map'?'active':''} onClick={()=>setViewMode('map')}><MapIcon/>Map</button><button className={viewMode==='street'?'active':''} onClick={()=>setViewMode('street')}><Route/>Street</button><button className={showZones?'active zones-on':'zones-on'} onClick={()=>{setShowZones(value=>!value);setTab('zones')}}><Layers3/>Zones</button></div>
   <div className="header-right"><div className="utc-clock"><span>COORDINATED UNIVERSAL TIME</span><b>{cityTime({ ...cities[0], tz:'UTC' })}<small> UTC</small></b></div><button className="icon-btn"><Settings2/></button></div>
  </header>

  <aside className={`sidebar ${sidebarCollapsed?'collapsed':''}`}>
   <div className="panel-head"><div><span className="eyebrow">GLOBAL DIRECTORY</span><h1>Places & time zones</h1></div><button className="collapse" aria-label={sidebarCollapsed?'Expand places panel':'Collapse places panel'} onClick={()=>setSidebarCollapsed(value=>!value)}><ChevronsLeft/></button></div>
   <div className="search"><Search/><input value={query} onChange={e=>{const value=e.target.value;setQuery(value);setLookupOpen(true);if(value.trim().length<3){setAddressSuggestions([]);setLookupLoading(false)}}} onFocus={()=>setLookupOpen(true)} onBlur={()=>setTimeout(()=>setLookupOpen(false),150)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();setQuery('');setAddressSuggestions([]);setLookupOpen(false);setTab('places');setExpanded([])}}} placeholder="Search cities, airports, landmarks or addresses" autoComplete="off"/>{query&&<button type="button" className="search-clear" aria-label="Clear search" title="Clear search" onClick={()=>{setQuery('');setAddressSuggestions([]);setLookupOpen(false);setLookupLoading(false);setTab('places');setExpanded([])}}><X/></button>}<kbd>{lookupLoading?'•••':'⌘ K'}</kbd>{lookupOpen&&query.trim().length>=3&&<div className="address-results"><div className="lookup-label"><MapPin/> PLACES & ADDRESS LOOKUP <span>OpenStreetMap</span></div>{addressSuggestions.length?addressSuggestions.map(suggestion=><button key={suggestion.id} onMouseDown={event=>event.preventDefault()} onClick={()=>chooseAddress(suggestion)}><MapPin/><div><b>{suggestion.title}</b><small>{suggestion.subtitle}</small></div></button>):!lookupLoading&&<div className="no-address">No matching addresses found</div>}</div>}</div>
   <div className="tabs"><button className={tab==='places'?'active':''} onClick={()=>setTab('places')}>Places <span>195</span></button><button className={tab==='favorites'?'active':''} onClick={()=>setTab('favorites')}><Star/> Favourites <span>{favoriteIds.length+customFavorites.length}</span></button><button className={tab==='zones'?'active':''} onClick={()=>{setTab('zones');setShowZones(true)}}>Zones <span>{zoneGroups.length}</span></button></div>
   <div className="directory">
    {tab==='places' ? shownCountries.map(country=>{const matches=citiesByCountry.get(country)||[];const open=expanded.includes(country)||!!query&&matches.length>0;const visibleMatches=matches.slice(0,query?150:80);return <div className="country" key={country}>
      <button className="country-row" onClick={()=>setExpanded(x=>x.includes(country)?x.filter(v=>v!==country):[...x,country])}><span className="round-flag">{matches[0]?flag(matches[0].code):'◦'}</span><b>{country}</b>{matches.length>0&&<small>{matches.length}</small>}<ChevronDown className={open?'rotated':''}/></button>
      {open&&visibleMatches.map(c=><button key={`${c.name}-${c.lat}-${c.lng}`} className={`city-row ${selected.name===c.name?'selected':''}`} onClick={()=>choose(c)}><span className="city-dot"/><div><b>{c.name}</b><small>{cityDate(c)}</small></div><time>{cityTime(c)}</time><span className="offset">{utcOffset(c)}</span></button>)}
      {open&&matches.length>visibleMatches.length&&<div className="more-cities">Showing {visibleMatches.length} of {matches.length.toLocaleString()} cities · Search to narrow</div>}
     </div>}) : tab==='favorites' ? <div className="favorites-list">
      <div className="favorite-transfer"><button type="button" onClick={downloadFavorites}>Export YAML</button><label aria-disabled={importing}>{importing?'Importing…':'Import YAML'}<input type="file" accept=".yaml,.yml,application/yaml,text/yaml" aria-label="Import favourites from YAML" disabled={importing} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void uploadFavorites(file)}}/></label><p>Import merges favourites, including aliases and tags.</p>{transferMessage&&<p role="status">{transferMessage}</p>}</div>
      {favoriteCities.length===0?<div className="empty-favorites"><Star/><b>{normalizedQuery?'No favourites found':'No favourite places yet'}</b><span>{normalizedQuery?'Try another search':'Select a location, then tap the star to save it here.'}</span></div>:favoriteCities.map(c=>{const meta=savedMeta[cityKey(c)];return <div className={`favorite-row ${cityKey(selected)===cityKey(c)?'selected':''}`} key={cityKey(c)}><button onClick={()=>choose(c)}><span>{flag(c.code)}</span><div><b>{displayName(c)}</b><small>{displayAddress(c)}</small>{meta?.tags.length>0&&<span className="tag-pills">{meta.tags.map(tag=><i key={tag}>{tag}</i>)}</span>}</div><time>{cityTime(c)}</time></button><button className="edit-saved" aria-label={`Edit ${displayName(c)}`} onClick={()=>beginSavedEdit(c)}><Pencil/></button><button aria-label={`Remove ${displayName(c)} from favourites`} onClick={()=>toggleFavorite(c)}><Star className="filled"/></button></div>})}
     </div> : zoneGroups.map(zone=><button className={`zone-row ${utcOffset(selected)===zone.offset?'selected':''}`} key={zone.offset} onClick={()=>{setSelected(zone.representative);setShowZones(true)}}><Clock3/><div><span>{zone.offset}</span><small>{zone.namedZones} named zone{zone.namedZones===1?'':'s'}</small></div><time>{cityTime(zone.representative)}</time><b>{zone.cities.length.toLocaleString()}</b></button>)}
   </div>
   <div className="visibility"><div className="city-layer-toggle"><div><MapPin/><span>SHOW ALL CITIES<small>{viewMode==='street'?'Available in Satellite and Map':'16,000 mapped locations'}</small></span></div><button type="button" role="switch" aria-checked={showCities} disabled={viewMode==='street'} className={showCities&&viewMode!=='street'?'on':''} onClick={()=>setShowCities(value=>!value)}><i/></button></div><div className="visibility-title"><span><Sun/> GLOBE VISIBILITY</span><b>{brightness}%</b></div><div className="range-wrap"><Moon/><input aria-label="Globe visibility" type="range" min="35" max="125" value={brightness} onChange={e=>setBrightness(+e.target.value)}/><Sun/></div><p>Adjust surface light to clarify time zone borders</p></div>
  </aside>

  <section className="world street-active">
   <WorldMap selected={selected} compare={compare} tripStart={tripStart} tripEnd={tripEnd} viewMode={viewMode} showStreetNames={showStreetNames} showCities={showCities} showZones={showZones} brightness={brightness} onSelect={choose} onContextLocation={onContextLocation} onZoom={onZoom}/>
   <div className="time-slider" onDoubleClick={()=>setSliderMinute(null)} title="Double-click to reset to your current local time">
    <div className="time-slider-head"><div><Clock3/><span>{homeLabel.toUpperCase()}</span><b>{minuteLabel(chosenHomeMinute)}</b>{sliderMinute===null&&<em>LIVE</em>}</div><div className="matching-time"><span>{displayName(selected).toUpperCase()}</span><strong>{selectedSliderTime}</strong><small>{selectedSliderDate}</small></div></div>
    <div className="time-slider-track"><span>12 AM</span><input aria-label={`${homeLabel} time`} type="range" min="0" max="1439" step="1" value={chosenHomeMinute} onChange={event=>setSliderMinute(Number(event.target.value))}/><span>11:59 PM</span></div>
    <p>Drag your home time to see the matching time in {displayName(selected)} · Double-click to reset</p>
   </div>
   <div className="atmosphere-label"><b>{viewMode==='satellite'?'SATELLITE IMAGERY':viewMode==='map'?'TOPOGRAPHIC MAP':'OPENSTREETMAP · STREET DETAIL'}</b> <span>•</span> TIME ZONES LIVE</div>
   <button className={`home-map-control ${home?'ready':''}`} title={home?`Go to home: ${displayName(home)}`:'Set detected location as home'} onClick={()=>{if(home)setSelected(home);else if(detectedLocation){setHome(detectedLocation);setSelected(detectedLocation)}else detectUserLocation()}}><House/><span>HOME</span></button>
   <button type="button" className={`street-names-control ${showStreetNames?'active':''}`} aria-pressed={showStreetNames} aria-label="Show street names" title={`${showStreetNames?'Hide':'Show'} street names and map labels`} onClick={()=>setShowStreetNames(value=>!value)}><MapIcon size={16}/><span>Street names</span><b>{showStreetNames?'ON':'OFF'}</b></button>
   {!home&&detectedLocation&&!locationPromptDismissed&&<div className="home-prompt"><House/><div><b>Set your home location?</b><small>{detectedLocation.name}, {detectedLocation.country}</small></div><button onClick={()=>{setHome(detectedLocation);setSelected(detectedLocation)}}>SET HOME</button><button aria-label="Dismiss home suggestion" onClick={()=>setLocationPromptDismissed(true)}><X/></button></div>}
   <div className="detail-card">
    <div className="card-pin">{flag(selected.code)}</div>{savedLocationKeys.has(cityKey(selected))&&<button className="edit-location-toggle" aria-label="Edit alias and tags" title="Edit alias and tags" onClick={event=>{event.stopPropagation();beginSavedEdit(selected)}}><Pencil/></button>}<button className={`home-toggle ${home&&cityKey(home)===cityKey(selected)?'active':''}`} aria-label="Set selected location as home" title="Set as home" onClick={event=>{event.stopPropagation();setHome(selected)}}><House/></button><button className={`favorite-toggle ${isFavorite(selected)?'active':''}`} aria-label={isFavorite(selected)?'Remove from favourites':'Add to favourites'} onClick={event=>{event.stopPropagation();toggleFavorite(selected)}}><Star/></button><button className="close-card"><X/></button>
    <div className="place-meta"><span>{selected.country.toUpperCase()}</span><h2>{displayName(selected)}</h2>{savedLocationKeys.has(cityKey(selected))&&<small className="saved-address">{displayAddress(selected)}</small>}{savedMeta[cityKey(selected)]?.tags.length>0&&<span className="detail-tags">{savedMeta[cityKey(selected)].tags.map(tag=><i key={tag}>{tag}</i>)}</span>}<p>{selected.lat.toFixed(3)}° {selected.lat>=0?'N':'S'} &nbsp; {Math.abs(selected.lng).toFixed(3)}° {selected.lng>=0?'E':'W'}</p></div>
    <div className="local-time"><div><span>{sliderMinute===null?'LOCAL TIME':'MATCHING TIME'}</span><strong>{selectedSliderTime}</strong></div><div><span>{sliderMinute===null?'TODAY':'SELECTED DATE'}</span><b>{selectedSliderDate}</b><small>{utcOffset(selected)}</small></div></div>
    {compare ? <div className="comparison"><div><span>{flag(compare.code)} {compare.name}</span><b>{cityTime(compare)}</b></div><div className="difference"><span>TIME DIFFERENCE</span><strong>{difference(selected,compare)}</strong></div><button onClick={()=>setCompare(null)}><X/></button></div>:
    <button className={`compare-button ${compareMode?'waiting':''}`} onClick={()=>setCompareMode(!compareMode)}><Plus/><span>{compareMode?'Select another city from the list':'Compare with another location'}</span></button>}
   </div>
   {compareMode&&<div className="compare-hint"><span>2</span><div><b>CHOOSE SECOND LOCATION</b><small>Select a city from the directory</small></div><button onClick={()=>setCompareMode(false)}><X/></button></div>}
   {tripStart&&tripEnd&&<div className="trip-panel"><div className="trip-head"><Navigation/><div><span>TRIP ESTIMATE</span><b>{tripStart.name} → {tripEnd.name}</b></div><button onClick={()=>{setTripStart(null);setTripEnd(null)}}><X/></button></div><div className="trip-modes">{travelModes.map(mode=>{const Icon=mode.icon;return <div key={mode.name}><Icon/><span>{mode.name}<small>{mode.distance}</small></span><b>{mode.time}</b></div>})}</div><p>Flight estimates use an average 820 km/h commercial speed, 35 minutes per flight segment, distance-based connections, and a 2-hour average layover. Actual routes, schedules and traffic may vary.</p></div>}
   <div className="legend"><span>TIME ZONE BORDER</span><i/><span>STANDARD MERIDIAN</span><i className="dashed"/><span><b className="day"/> DAY</span><span><b className="night"/> NIGHT</span></div>
  </section>
  {editingSaved&&<div className="saved-editor-backdrop" onClick={()=>setEditingSaved(null)}><form className="saved-editor" onSubmit={event=>{event.preventDefault();saveSavedEdit()}} onClick={event=>event.stopPropagation()}><div className="saved-editor-head"><Pencil/><div><span>SAVED LOCATION</span><h3>Edit alias & tags</h3></div><button type="button" onClick={()=>setEditingSaved(null)}><X/></button></div><div className="editor-location"><b>{editingSaved.name}</b><small>{locationAddress(editingSaved)}</small></div><label>DISPLAY NAME<input autoFocus value={aliasDraft} onChange={event=>setAliasDraft(event.target.value)} placeholder={editingSaved.name}/></label><label><span><Tag/> TAGS</span><input value={tagsDraft} onChange={event=>setTagsDraft(event.target.value)} placeholder="work, family, holiday"/><small>Separate tags with commas. Tags are included in search.</small></label>{tagsDraft.trim()&&<div className="editor-tag-preview">{tagsDraft.split(',').map(tag=>tag.trim()).filter(Boolean).map(tag=><i key={tag}>{tag}</i>)}</div>}<div className="editor-actions"><button type="button" onClick={()=>setEditingSaved(null)}>CANCEL</button><button type="submit">SAVE LOCATION</button></div></form></div>}
  {contextLocation&&<div className="map-context" style={{left:contextLocation.x,top:contextLocation.y}} onClick={event=>event.stopPropagation()}><div className="context-place"><MapPin/><div><b>{contextLocation.point.name}</b><small>{contextLocation.point.lat.toFixed(4)}°, {contextLocation.point.lng.toFixed(4)}°</small></div></div><button onClick={()=>{setSelected(contextLocation.point);setCompareMode(false);setContextLocation(null)}}><MapPin/> Set location at this point</button><button onClick={()=>{setHome(contextLocation.point);setSelected(contextLocation.point);setContextLocation(null)}}><House/> Set this point as Home</button><button onClick={()=>{if(!isFavorite(contextLocation.point))setCustomFavorites(items=>[...items,contextLocation.point]);setContextLocation(null)}}><Star/> Add location to favourites</button><button onClick={()=>{setTripStart(contextLocation.point);setTripEnd(null);setContextLocation(null)}}><span className="point-label">A</span> Set as trip starting point</button><button onClick={()=>{if(!tripStart)setTripStart(selected);setTripEnd(contextLocation.point);setContextLocation(null)}}><span className="point-label end">B</span> {tripStart?'Set as trip destination':'Route here from selected city'}</button></div>}
 </main>
}
