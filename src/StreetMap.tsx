import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { icon, type LatLngExpression } from 'leaflet'
import { cities, cityTime, flag, type City } from './data'
import 'leaflet/dist/leaflet.css'

function MapController({ focus }: { focus: {lat:number;lng:number} }) {
  const map = useMap()
  useEffect(() => {
    const frame=requestAnimationFrame(()=>{map.invalidateSize();map.stop();map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 7), { duration: 0.7 })})
    return()=>cancelAnimationFrame(frame)
  }, [map, focus])
  return null
}

function MapSelection({ onSelect, onContextLocation, onExitDetail, detailMode }: { onSelect: (city: City) => void; onContextLocation: (lat:number,lng:number,x:number,y:number)=>void; onExitDetail?:()=>void; detailMode:boolean }) {
  const map=useMapEvents({
    click(event) {
      const lat = event.latlng.lat
      const lng = event.latlng.lng
      const nearest = cities.reduce((best, city) => {
        const score = (city.lat - lat) ** 2 + (city.lng - lng) ** 2 * Math.cos(lat * Math.PI / 180) ** 2
        return score < best.score ? { city, score } : best
      }, { city: cities[0], score: Infinity })
      onSelect(nearest.city)
    },
    contextmenu(event){const original=event.originalEvent as MouseEvent;original.preventDefault();onContextLocation(event.latlng.lat,event.latlng.lng,original.clientX,original.clientY)},
    zoomend(){if(detailMode&&map.getZoom()<=3)onExitDetail?.()},
  })
  return null
}

const selectedIcon=icon({iconUrl:`${import.meta.env.BASE_URL}assets/map-marker.svg?v=2`,iconSize:[20,27],iconAnchor:[10,26],popupAnchor:[0,-25]})

const meridians: LatLngExpression[][] = Array.from({ length: 24 }, (_, index) => {
  const lng = -180 + index * 15
  return [[-85, lng], [85, lng]]
})

export default function StreetMap({ selected, focus=selected, compare, tripStart, tripEnd, tileStyle='street', onSelect, onContextLocation, onExitDetail }: { selected: City; focus?:{lat:number;lng:number}; compare: City | null; tripStart:City|null; tripEnd:City|null; tileStyle?:'street'|'satellite'|'map'; onSelect: (city: City) => void; onContextLocation:(lat:number,lng:number,x:number,y:number)=>void; onExitDetail?:()=>void }) {
  const satellite=tileStyle==='satellite'
  return <div className={`street-map detail-${tileStyle}`}>
    <MapContainer center={[focus.lat, focus.lng]} zoom={7} minZoom={2} maxZoom={19} zoomControl={false} worldCopyJump preferCanvas>
      {satellite?<TileLayer attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19}/>:<TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}/>} 
      {meridians.map((positions, index) => <Polyline key={index} positions={positions} pathOptions={{ color: index % 3 === 0 ? '#e8c66e' : '#c6dc9b', weight: index % 3 === 0 ? 1.2 : 0.7, opacity: index % 3 === 0 ? 0.7 : 0.42 }} />)}
      <Marker position={[selected.lat, selected.lng]} icon={selectedIcon} zIndexOffset={1000}>
        <Popup><b>{flag(selected.code)} {selected.name}</b><br />{cityTime(selected)} · {selected.country}</Popup>
      </Marker>
      {compare && <CircleMarker center={[compare.lat, compare.lng]} radius={4} pathOptions={{ color: '#513a20', fillColor: '#ffbf69', fillOpacity: 1, weight: 1 }} />}
      {tripStart&&tripEnd&&<><Polyline positions={[[tripStart.lat,tripStart.lng],[tripEnd.lat,tripEnd.lng]]} pathOptions={{color:'#1b2a23',weight:5,opacity:.75,dashArray:'9 7'}}/><CircleMarker center={[tripStart.lat,tripStart.lng]} radius={5} pathOptions={{color:'#17211d',fillColor:'#e6f6aa',fillOpacity:1}}/><CircleMarker center={[tripEnd.lat,tripEnd.lng]} radius={5} pathOptions={{color:'#17211d',fillColor:'#ffbf69',fillOpacity:1}}/></>}
      <ZoomControl position="topright" />
      <MapController focus={focus} />
      <MapSelection onSelect={onSelect} onContextLocation={onContextLocation} onExitDetail={onExitDetail} detailMode={tileStyle!=='street'} />
    </MapContainer>
  </div>
}
