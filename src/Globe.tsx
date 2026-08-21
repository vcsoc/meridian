import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { cities, nearbyColors, type City } from './data'

function pos(lat:number,lng:number,r:number){const phi=(90-lat)*Math.PI/180,theta=(lng+180)*Math.PI/180;return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta))}

export default function Globe({selected,compare,brightness,viewMode,onSelect,onNearby,onContextLocation,onZoom}:{selected:City;compare:City|null;brightness:number;viewMode:'satellite'|'map';onSelect:(c:City)=>void;onNearby:(cities:City[])=>void;onContextLocation:(lat:number,lng:number,x:number,y:number)=>void;onZoom:(v:number,lat:number,lng:number)=>void}){
 const mount=useRef<HTMLDivElement>(null)
 const selectRef=useRef(onSelect);const nearbyRef=useRef(onNearby);const contextRef=useRef(onContextLocation)
 const state=useRef<{camera:THREE.PerspectiveCamera;controls:OrbitControls;markers:THREE.Group;renderer:THREE.WebGLRenderer;material:THREE.MeshPhongMaterial;satellite:THREE.Texture;specular:THREE.Texture;markerTexture:THREE.Texture}|null>(null)
 useEffect(()=>{selectRef.current=onSelect},[onSelect])
 useEffect(()=>{nearbyRef.current=onNearby},[onNearby])
 useEffect(()=>{contextRef.current=onContextLocation},[onContextLocation])
 useEffect(()=>{
  const host=mount.current!; const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(40,host.clientWidth/host.clientHeight,.005,100);camera.position.set(0.3,.8,7.2)
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.045;controls.minDistance=2.025;controls.maxDistance=9;controls.zoomSpeed=.72;controls.zoomToCursor=true;controls.enablePan=false;controls.autoRotate=true;controls.autoRotateSpeed=.22
  scene.add(new THREE.AmbientLight(0x9bb2bd,1.35));const sun=new THREE.DirectionalLight(0xfff4dd,3.1);sun.position.set(-4,3,5);scene.add(sun)
  const satellite=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/earth-satellite.jpg`,loaded=>{loaded.colorSpace=THREE.SRGBColorSpace;loaded.anisotropy=renderer.capabilities.getMaxAnisotropy();loaded.minFilter=THREE.LinearMipmapLinearFilter;loaded.magFilter=THREE.LinearFilter;loaded.generateMipmaps=true;loaded.needsUpdate=true})
  satellite.colorSpace=THREE.SRGBColorSpace
  const specular=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/earth-specular.jpg`);specular.anisotropy=renderer.capabilities.getMaxAnisotropy()
  const material=new THREE.MeshPhongMaterial({map:satellite,specularMap:specular,specular:0x6f8791,shininess:12})
  const globe=new THREE.Mesh(new THREE.SphereGeometry(2,128,128),material);scene.add(globe)
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(2.045,96,96),new THREE.MeshBasicMaterial({color:0x78b8b2,transparent:true,opacity:.07,side:THREE.BackSide}));atmosphere.scale.setScalar(1.08);scene.add(atmosphere)
  // 24 time zone meridians
  const zones=new THREE.Group();scene.add(zones)
  for(let lng=-180;lng<180;lng+=15){const points=[];for(let lat=-86;lat<=86;lat+=2)points.push(pos(lat,lng,2.012));const geo=new THREE.BufferGeometry().setFromPoints(points);const major=lng%45===0;zones.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:major?0xf1c86b:0xbfd69d,transparent:true,opacity:major?.8:.38})))}
  // equator & tropics
  ;[-66.5,-23.5,0,23.5,66.5].forEach(lat=>{const pts=[];for(let lng=-180;lng<=180;lng+=2)pts.push(pos(lat,lng,2.013));zones.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xd7e4bb,transparent:true,opacity:lat===0?.32:.12})))})
  const markers=new THREE.Group();scene.add(markers)
  const hoverMarkers=new THREE.Group();scene.add(hoverMarkers)
  const hoverGeometry=new THREE.SphereGeometry(.006,8,8);nearbyColors.forEach(color=>{const dot=new THREE.Mesh(hoverGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95}));dot.visible=false;hoverMarkers.add(dot)})
  const markerTexture=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/map-marker.svg?v=2`)
  state.current={camera,controls,markers,renderer,material,satellite,specular,markerTexture}
  renderer.domElement.title='Drag to rotate · Scroll to zoom · Click to select the nearest city'
  let id=0,lastFrame=0;const animate=(now=0)=>{id=requestAnimationFrame(animate);if(now-lastFrame<22)return;lastFrame=now;const distance=camera.position.length();const zoomRatio=THREE.MathUtils.clamp((distance-controls.minDistance)/(controls.maxDistance-controls.minDistance),0,1);controls.rotateSpeed=.08+zoomRatio*.52;controls.autoRotateSpeed=.06+zoomRatio*.16;const hoverScale=THREE.MathUtils.clamp(distance/7.2,.3,1);hoverMarkers.children.forEach(marker=>marker.scale.setScalar(hoverScale));const markerScale=THREE.MathUtils.clamp(Math.pow(distance/7.2,1.6),.12,1);markers.children.forEach(marker=>{if(marker instanceof THREE.Sprite){marker.scale.set(.095*markerScale,.128*markerScale,1)}});controls.update();renderer.render(scene,camera)};animate()
  let wheelFrame=0;const wheel=(event:WheelEvent)=>{const bounds=renderer.domElement.getBoundingClientRect();const zoomPoint=new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);cancelAnimationFrame(wheelFrame);wheelFrame=requestAnimationFrame(()=>{const centerRay=new THREE.Raycaster();centerRay.setFromCamera(zoomPoint,camera);const point=centerRay.intersectObject(globe)[0]?.point||camera.position.clone().normalize().multiplyScalar(2);const lat=Math.asin(point.y/point.length())*180/Math.PI;let lng=Math.atan2(point.z,-point.x)*180/Math.PI-180;if(lng< -180)lng+=360;onZoom(Math.max(0,Math.min(1,(7.2-camera.position.length())/4.4)),lat,lng)})};renderer.domElement.addEventListener('wheel',wheel)
  let pointerStart={x:0,y:0}
  const pointerDown=(event:PointerEvent)=>{pointerStart={x:event.clientX,y:event.clientY}}
  const pointerUp=(event:PointerEvent)=>{
   if(Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>5)return
   const bounds=renderer.domElement.getBoundingClientRect();const mouse=new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1)
   const hit=new THREE.Raycaster();hit.setFromCamera(mouse,camera);const point=hit.intersectObject(globe)[0]?.point;if(!point)return
   const lat=Math.asin(point.y/point.length())*180/Math.PI;let lng=Math.atan2(point.z,-point.x)*180/Math.PI-180;if(lng< -180)lng+=360
   const nearest=cities.reduce((best,city)=>{const score=(city.lat-lat)**2+(city.lng-lng)**2*Math.cos(lat*Math.PI/180)**2;return score<best.score?{city,score}:best},{city:cities[0],score:Infinity})
   selectRef.current(nearest.city)
  }
  const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();let lastHover=0,lastNearbyKey=''
  const clearHover=()=>{hoverMarkers.children.forEach(child=>{child.visible=false});lastNearbyKey=''}
  const pointFromEvent=(event:PointerEvent)=>{const bounds=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(globe)[0]?.point}
  const pointerMove=(event:PointerEvent)=>{const now=performance.now();if(now-lastHover<120)return;lastHover=now;const point=pointFromEvent(event);if(!point)return;const lat=Math.asin(point.y/point.length())*180/Math.PI;let lng=Math.atan2(point.z,-point.x)*180/Math.PI-180;if(lng< -180)lng+=360
   const nearest:{city:City;score:number}[]=[];for(const city of cities){const rawLng=Math.abs(city.lng-lng);const lngDistance=Math.min(rawLng,360-rawLng);const score=(city.lat-lat)**2+lngDistance**2*Math.cos(lat*Math.PI/180)**2;if(nearest.length<7||score<nearest[nearest.length-1].score){nearest.push({city,score});nearest.sort((a,b)=>a.score-b.score);if(nearest.length>7)nearest.pop()}}
   const nearbyKey=nearest.map(item=>`${item.city.lat},${item.city.lng}`).join('|');if(nearbyKey===lastNearbyKey)return;lastNearbyKey=nearbyKey;nearest.forEach(({city},index)=>{const dot=hoverMarkers.children[index];dot.position.copy(pos(city.lat,city.lng,2.025));dot.visible=true});nearbyRef.current(nearest.map(item=>item.city))
  }
  const pointerLeave=()=>{if(!lastNearbyKey)return;clearHover();nearbyRef.current([])}
  const contextMenu=(event:MouseEvent)=>{event.preventDefault();const point=pointFromEvent(event as PointerEvent);if(!point)return;const lat=Math.asin(point.y/point.length())*180/Math.PI;let lng=Math.atan2(point.z,-point.x)*180/Math.PI-180;if(lng< -180)lng+=360;contextRef.current(lat,lng,event.clientX,event.clientY)}
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerleave',pointerLeave);renderer.domElement.addEventListener('contextmenu',contextMenu)
  const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)};window.addEventListener('resize',resize)
  return()=>{cancelAnimationFrame(id);cancelAnimationFrame(wheelFrame);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerleave',pointerLeave);renderer.domElement.removeEventListener('contextmenu',contextMenu);controls.dispose();material.dispose();satellite.dispose();specular.dispose();markerTexture.dispose();hoverGeometry.dispose();hoverMarkers.children.forEach(child=>{if(child instanceof THREE.Mesh&&child.material instanceof THREE.Material)child.material.dispose()});renderer.dispose();host.removeChild(renderer.domElement)}
 },[onZoom])
 useEffect(()=>{const s=state.current;if(!s)return;s.markers.children.forEach(marker=>{if(marker instanceof THREE.Sprite)marker.material.dispose()});s.markers.clear();[selected,compare].filter(Boolean).forEach(city=>{const c=city as City;const marker=new THREE.Sprite(new THREE.SpriteMaterial({map:s.markerTexture,color:0xffffff,depthTest:false}));marker.center.set(.5,.05);marker.scale.set(.095,.128,1);marker.position.copy(pos(c.lat,c.lng,2.04));marker.renderOrder=20;s.markers.add(marker)})
 },[selected,compare])
 useEffect(()=>{const s=state.current;if(!s)return;const distance=s.camera.position.length();s.controls.autoRotate=false;s.camera.position.copy(pos(selected.lat,selected.lng,distance));s.camera.lookAt(0,0,0);s.controls.target.set(0,0,0);s.controls.update()},[selected])
 useEffect(()=>{if(state.current)state.current.renderer.domElement.style.filter=`brightness(${brightness}%)`},[brightness])
 useEffect(()=>{const s=state.current;if(!s)return;s.material.map=s.satellite;s.material.specularMap=viewMode==='satellite'?s.specular:null;s.material.color.set(viewMode==='satellite'?0xffffff:0xd5dfd2);s.material.shininess=viewMode==='satellite'?12:3;s.material.needsUpdate=true},[viewMode])
 return <div ref={mount} className="globe-canvas" />
}
