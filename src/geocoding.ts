export type AddressSuggestion={id:string;label:string;title:string;subtitle:string;lat:number;lng:number;country:string;code:string}

type PhotonFeature={geometry:{coordinates:[number,number]};properties:{osm_id?:number;osm_type?:string;osm_key?:string;osm_value?:string;name?:string;street?:string;housenumber?:string;district?:string;locality?:string;city?:string;state?:string;country?:string;countrycode?:string;postcode?:string}}
type PhotonPayload={features?:PhotonFeature[]}

function fallbackQuery(search:string){
  const parts=search.split(',').map(part=>part.trim()).filter(Boolean)
  if(parts.length<2)return null
  const withoutStandalonePostcode=parts.filter(part=>!/^\d{4,6}$/.test(part))
  return withoutStandalonePostcode.join(' ')
}

function toSuggestion(feature:PhotonFeature,index:number):AddressSuggestion{
  const p=feature.properties
  const title=p.name||[p.housenumber,p.street].filter(Boolean).join(' ')||p.city||'Mapped location'
  const kindLabels:Record<string,string>={aerodrome:'Airport',airport:'Airport',station:'Station',hotel:'Hotel',museum:'Museum',hospital:'Hospital',university:'University',stadium:'Stadium',attraction:'Landmark'}
  const kind=kindLabels[p.osm_value||'']
  const street=p.street&&p.street!==title?p.street:undefined
  const subtitle=[kind,street,p.district||p.locality,p.city,p.state,p.postcode,p.country].filter((item,pos,all)=>item&&all.indexOf(item)===pos).join(', ')
  return{id:`${p.osm_type||'place'}-${p.osm_id||index}`,label:[title,subtitle].filter(Boolean).join(', '),title,subtitle,lat:feature.geometry.coordinates[1],lng:feature.geometry.coordinates[0],country:p.country||p.city||'Mapped location',code:(p.countrycode||'UN').toUpperCase()}
}

async function fetchPhoton(search:string,signal:AbortSignal){
  const response=await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(search)}&limit=6&lang=en`,{signal})
  if(!response.ok)throw new Error('Address lookup unavailable')
  const payload=await response.json() as PhotonPayload
  return (payload.features||[]).map(toSuggestion)
}

export async function lookupAddress(search:string,signal:AbortSignal){
  const exact=await fetchPhoton(search,signal)
  if(exact.length)return exact

  // Photon can reject an otherwise valid OSM address when punctuation or a
  // postcode does not match its index. Retry a normalized version, omitting a
  // standalone numeric postcode, to return the closest OpenStreetMap match.
  const fallback=fallbackQuery(search)
  return fallback?fetchPhoton(fallback,signal):exact
}
