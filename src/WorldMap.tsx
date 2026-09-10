import { useEffect, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type MapLayerMouseEvent, type Marker, type MapMouseEvent, type StyleSpecification } from 'maplibre-gl'
import type { FeatureCollection, LineString, Point } from 'geojson'
import { cities, nearbyColors, type City } from './data'
import 'maplibre-gl/dist/maplibre-gl.css'
import basemapStyle from './basemap-style.json'

// OpenFreeMap's Liberty style uses public vector tiles; street labels are independent layers.
const basemap = basemapStyle as StyleSpecification
const streetLabelLayers = basemap.layers.filter(layer=>layer.type==='symbol'&&layer['source-layer']==='transportation_name')

const meridians:FeatureCollection<LineString>={type:'FeatureCollection',features:Array.from({length:24},(_,index)=>{const lng=-180+index*15;return{type:'Feature',properties:{major:index%3===0},geometry:{type:'LineString',coordinates:[[lng,-85],[lng,85]]}}})}
const emptyLine:FeatureCollection<LineString>={type:'FeatureCollection',features:[]}
let allCityPoints:FeatureCollection<Point>|null=null
function getAllCityPoints(){if(!allCityPoints)allCityPoints={type:'FeatureCollection',features:cities.map((city,index)=>({type:'Feature',id:index,properties:{name:city.name,country:city.country},geometry:{type:'Point',coordinates:[city.lng,city.lat]}}))};return allCityPoints}

const style:StyleSpecification={version:8,projection:{type:'globe'},glyphs:basemap.glyphs,sprite:basemap.sprite,sources:{
 ...basemap.sources,
 satellite:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Tiles © Esri, Maxar, Earthstar Geographics'},
 timezoneLines:{type:'geojson',data:meridians},tripLine:{type:'geojson',data:emptyLine}
},layers:[
 {id:'satellite',type:'raster',source:'satellite',paint:{'raster-opacity':1,'raster-fade-duration':120}},
 ...basemap.layers.map(layer=>({...layer,layout:{...layer.layout,visibility:'none' as const}})),
 {id:'timezone-lines',type:'line',source:'timezoneLines',paint:{'line-color':['case',['get','major'],'#f1c86b','#bfd69d'],'line-width':['case',['get','major'],1.2,.65],'line-opacity':['case',['get','major'],.75,.42]}},
 {id:'trip-line',type:'line',source:'tripLine',paint:{'line-color':'#ff9a24','line-width':3,'line-dasharray':[2,2]}}
]}

function nearestCities(lat:number,lng:number,count=7){const nearest:{city:City;score:number}[]=[];for(const city of cities){const rawLng=Math.abs(city.lng-lng);const dLng=Math.min(rawLng,360-rawLng);const score=(city.lat-lat)**2+dLng**2*Math.cos(lat*Math.PI/180)**2;if(nearest.length<count||score<nearest[nearest.length-1].score){nearest.push({city,score});nearest.sort((a,b)=>a.score-b.score);if(nearest.length>count)nearest.pop()}}return nearest.map(item=>item.city)}
function createMarker(){const element=document.createElement('img');element.src=`${import.meta.env.BASE_URL}assets/map-marker.svg?v=2`;element.className='world-map-marker';return new maplibregl.Marker({element,anchor:'bottom',subpixelPositioning:true})}
function createNearbyMarker(color:string){const element=document.createElement('div');element.className='nearby-map-marker';const pin=document.createElement('span');pin.style.backgroundColor=color;pin.innerHTML='<i></i>';element.appendChild(pin);return new maplibregl.Marker({element,anchor:'bottom',subpixelPositioning:true})}

export default function WorldMap({selected,compare,tripStart,tripEnd,viewMode,showStreetNames,showCities,showZones,brightness,onSelect,onContextLocation,onZoom}:{selected:City;compare:City|null;tripStart:City|null;tripEnd:City|null;viewMode:'satellite'|'map'|'street';showStreetNames:boolean;showCities:boolean;showZones:boolean;brightness:number;onSelect:(city:City)=>void;onContextLocation:(lat:number,lng:number,x:number,y:number)=>void;onZoom:(value:number,lat:number,lng:number)=>void}){
 const host=useRef<HTMLDivElement>(null);const initialSelection=useRef(selected);const mapRef=useRef<MapLibreMap|null>(null);const selectedMarker=useRef<Marker|null>(null);const compareMarker=useRef<Marker|null>(null);const nearbyMarkersRef=useRef<Marker[]>([])
 const selectRef=useRef(onSelect);const contextRef=useRef(onContextLocation);const zoomRef=useRef(onZoom);const lastNearby=useRef('');const previousSelection=useRef(`${selected.lat},${selected.lng}`);const [ready,setReady]=useState(false);const [nearby,setNearby]=useState<City[]>([])
 useEffect(()=>{selectRef.current=onSelect;contextRef.current=onContextLocation;zoomRef.current=onZoom},[onSelect,onContextLocation,onZoom])
 useEffect(()=>{if(!host.current)return;const initial=initialSelection.current;const map=new maplibregl.Map({container:host.current,style,center:[initial.lng,initial.lat],zoom:1.7,maxZoom:19,minZoom:1,maxPitch:75,dragRotate:true,touchPitch:true,pitchWithRotate:true,attributionControl:false,fadeDuration:120,renderWorldCopies:false});mapRef.current=map;map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right')
  const nearbyMarkers=nearbyMarkersRef.current;let hoverTimer=0,zoomTimer=0;let lastPointer:{x:number;y:number}|null=null;const updateNearby=(lat:number,lng:number)=>{const nearby=nearestCities(lat,lng);const key=nearby.map(city=>`${city.lat},${city.lng}`).join('|');if(key===lastNearby.current)return;lastNearby.current=key;nearby.forEach((city,index)=>{const marker=nearbyMarkers[index];if(marker){marker.setLngLat([city.lng,city.lat]);marker.getElement().style.display='block'}});setNearby(nearby)};map.on('style.load',()=>{nearbyColors.forEach(color=>{const marker=createNearbyMarker(color).setLngLat([0,0]).addTo(map);marker.getElement().style.display='none';nearbyMarkers.push(marker)});setReady(true)});map.on('click',event=>{const layers=['all-city-points','all-city-labels'].filter(layer=>map.getLayer(layer)&&map.getLayoutProperty(layer,'visibility')!=='none');if(!layers.length)return;const feature=map.queryRenderedFeatures(event.point,{layers})[0];if(feature?.id===undefined)return;const city=cities[Number(feature.id)];if(city)selectRef.current(city)});map.on('contextmenu',event=>{event.preventDefault();contextRef.current(event.lngLat.lat,event.lngLat.lng,event.originalEvent.clientX,event.originalEvent.clientY)});map.on('mousemove',event=>{if(!(event.originalEvent as MouseEvent).ctrlKey)return;const now=performance.now();if(now-hoverTimer<120)return;hoverTimer=now;lastPointer={x:event.point.x,y:event.point.y};updateNearby(event.lngLat.lat,event.lngLat.lng)});map.on('zoom',()=>{if(!lastPointer||!lastNearby.current)return;const now=performance.now();if(now-zoomTimer<100)return;zoomTimer=now;const location=map.unproject([lastPointer.x,lastPointer.y]);updateNearby(location.lat,location.lng)});map.on('zoomend',()=>{const center=map.getCenter();zoomRef.current(Math.min(1,map.getZoom()/12),center.lat,center.lng)});return()=>{nearbyMarkers.forEach(marker=>marker.remove());nearbyMarkers.length=0;map.remove();mapRef.current=null}},[])
 useEffect(()=>{const map=mapRef.current;if(!map||!ready)return;const satellite=viewMode==='satellite';map.setLayoutProperty('satellite','visibility',satellite?'visible':'none');for(const layer of basemap.layers){const streetName='source-layer' in layer&&layer['source-layer']==='transportation_name';const visible=(satellite?streetName:true)&&(!streetName||showStreetNames)&&layer.layout?.visibility!=='none';map.setLayoutProperty(layer.id,'visibility',visible?'visible':'none')}},[viewMode,showStreetNames,ready])
 useEffect(()=>{
  const map=mapRef.current;if(!map||!ready)return
  const satellite=viewMode==='satellite'
  for(const layer of streetLabelLayers){
   if(layer.type!=='symbol')continue
   map.setLayoutProperty(layer.id,'text-size',satellite?['interpolate',['linear'],['zoom'],6,13,14,16,19,19]:layer.layout?.['text-size']??16)
   map.setPaintProperty(layer.id,'text-color',satellite?'#ffffff':layer.paint?.['text-color']??'#333333')
   map.setPaintProperty(layer.id,'text-halo-color',satellite?'#091217':layer.paint?.['text-halo-color']??'#ffffff')
   map.setPaintProperty(layer.id,'text-halo-width',satellite?2:layer.paint?.['text-halo-width']??1)
   map.setPaintProperty(layer.id,'text-halo-blur',satellite?.5:layer.paint?.['text-halo-blur']??0)
  }
 },[viewMode,ready])
 useEffect(()=>{
  const map=mapRef.current;if(!map||!ready||!showStreetNames)return
  const popup=new maplibregl.Popup({closeButton:false,closeOnClick:false,offset:16,maxWidth:'280px',className:'street-tooltip'})
  const content=document.createElement('div');const name=document.createElement('strong');const coordinates=document.createElement('span')
  content.append(name,coordinates)
  const clear=()=>popup.remove()
  const hover=(event:MapMouseEvent)=>{
   if(map.isMoving()||event.originalEvent.buttons){clear();return}
   const layers=streetLabelLayers.map(layer=>layer.id).filter(id=>map.getLayoutProperty(id,'visibility')!=='none')
   const feature=map.queryRenderedFeatures(event.point,{layers})[0]
   const properties=feature?.properties
   const label=properties?.['name:latin']||properties?.name||properties?.ref
   if(typeof label!=='string'||!label){clear();return}
   name.textContent=label
   const {lat,lng}=event.lngLat.wrap()
   coordinates.textContent=`Cursor: ${lat.toFixed(5)}°, ${lng.toFixed(5)}° (lat, lon)`
   popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map)
  }
  map.on('mousemove',hover);map.on('movestart',clear)
  const canvas=map.getCanvas();canvas.addEventListener('mouseleave',clear)
  return()=>{clear();map.off('mousemove',hover);map.off('movestart',clear);canvas.removeEventListener('mouseleave',clear)}
 },[ready,showStreetNames,viewMode])
 useEffect(()=>{const map=mapRef.current;if(map&&ready)map.setLayoutProperty('timezone-lines','visibility',showZones?'visible':'none')},[showZones,ready])
 useEffect(()=>{const map=mapRef.current;if(!map||!ready)return;const level=brightness/100;const minimum=Math.max(0,Math.min(.35,(level-1)*.5));const maximum=Math.max(.2,Math.min(1,level));['satellite'].forEach(layer=>{map.setPaintProperty(layer,'raster-brightness-min',minimum);map.setPaintProperty(layer,'raster-brightness-max',maximum)})},[brightness,ready])
 useEffect(()=>{const map=mapRef.current;if(!map||!ready)return;if(showCities&&!map.getSource('allCities')){map.addSource('allCities',{type:'geojson',data:getAllCityPoints()});map.addLayer({id:'all-city-points',type:'circle',source:'allCities',paint:{'circle-radius':['case',['boolean',['feature-state','hover'],false],['interpolate',['linear'],['zoom'],1,3.5,10,5,16,7],['interpolate',['linear'],['zoom'],1,1.25,5,1.75,10,2.5,16,3.25]],'circle-color':['case',['boolean',['feature-state','hover'],false],'#36f1cf','#ff9a24'],'circle-opacity':1,'circle-stroke-color':['case',['boolean',['feature-state','hover'],false],'#eafff9','#381707'],'circle-stroke-width':['case',['boolean',['feature-state','hover'],false],1.5,['interpolate',['linear'],['zoom'],1,0,7,.5]]}},'timezone-lines');map.addLayer({id:'all-city-labels',type:'symbol',source:'allCities',layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],1,8,8,10,14,12],'text-anchor':'top','text-offset':[0,.75],'text-max-width':10,'text-padding':2},paint:{'text-color':['case',['boolean',['feature-state','hover'],false],'#54ffe0','#f5f8f6'],'text-opacity':1,'text-halo-color':'rgba(5,12,14,.9)','text-halo-width':1}},'timezone-lines');let hoveredId:string|number|null=null;const hoverCity=(event:MapLayerMouseEvent)=>{const id=event.features?.[0]?.id;if(id===undefined)return;if(hoveredId!==null&&hoveredId!==id)map.setFeatureState({source:'allCities',id:hoveredId},{hover:false});hoveredId=id;map.setFeatureState({source:'allCities',id},{hover:true});map.getCanvas().style.cursor='pointer'};const leaveCity=()=>{if(hoveredId!==null)map.setFeatureState({source:'allCities',id:hoveredId},{hover:false});hoveredId=null;map.getCanvas().style.cursor=''};map.on('mousemove','all-city-points',hoverCity);map.on('mousemove','all-city-labels',hoverCity);map.on('mouseleave','all-city-points',leaveCity);map.on('mouseleave','all-city-labels',leaveCity)}const visible=showCities&&viewMode!=='street'?'visible':'none';if(map.getLayer('all-city-points'))map.setLayoutProperty('all-city-points','visibility',visible);if(map.getLayer('all-city-labels'))map.setLayoutProperty('all-city-labels','visibility',visible)},[showCities,viewMode,ready])
 useEffect(()=>{const map=mapRef.current;if(!map||!ready)return;if(!selectedMarker.current)selectedMarker.current=createMarker().setLngLat([selected.lng,selected.lat]).addTo(map);else selectedMarker.current.setLngLat([selected.lng,selected.lat]);const key=`${selected.lat},${selected.lng}`;if(previousSelection.current!==key){previousSelection.current=key;map.flyTo({center:[selected.lng,selected.lat],zoom:Math.max(map.getZoom(),6),duration:650,essential:true})}},[selected,ready])
 useEffect(()=>{const map=mapRef.current;if(!map||!ready)return;if(compare){if(!compareMarker.current){compareMarker.current=createMarker();compareMarker.current.getElement().classList.add('compare');compareMarker.current.setLngLat([compare.lng,compare.lat]).addTo(map)}else compareMarker.current.setLngLat([compare.lng,compare.lat])}else{compareMarker.current?.remove();compareMarker.current=null}},[compare,ready])
 useEffect(()=>{const map=mapRef.current;if(!map||!ready)return;const source=map.getSource('tripLine') as GeoJSONSource;if(tripStart&&tripEnd)source.setData({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[tripStart.lng,tripStart.lat],[tripEnd.lng,tripEnd.lat]]}}]});else source.setData(emptyLine)},[tripStart,tripEnd,ready])
 const adjustTilt=(amount:number)=>{const map=mapRef.current;if(map)map.easeTo({pitch:Math.max(0,Math.min(75,map.getPitch()+amount)),duration:250})}
 const dismissNearby=()=>{lastNearby.current='';nearbyMarkersRef.current.forEach(marker=>{marker.getElement().style.display='none'});setNearby([])}
 return <><div ref={host} className="unified-world-map"/><div className="tilt-controls"><span>TILT</span><button title="Tilt view up" aria-label="Tilt view up" onClick={()=>adjustTilt(15)}>⌃</button><button title="Tilt view down" aria-label="Tilt view down" onClick={()=>adjustTilt(-15)}>⌄</button><small>Right-drag</small></div>{nearby.length>0&&<div className="nearby-panel"><span>NEARBY CITIES <em>CTRL + MOVE</em><button type="button" aria-label="Close nearby cities" onClick={dismissNearby}>×</button></span>{nearby.map((city,index)=><button type="button" key={`${city.name}-${city.lat}-${city.lng}`} onClick={()=>selectRef.current(city)}><i style={{backgroundColor:nearbyColors[index]}}>{index+1}</i><b>{city.name}</b><small>{city.country}</small></button>)}</div>}</>
}
