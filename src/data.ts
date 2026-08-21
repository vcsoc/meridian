import generatedCountries from './countries.generated.json'
import generatedCities from './cities.generated.json'

export type City = { name: string; country: string; code: string; lat: number; lng: number; tz: string; address?: string }
export const nearbyColors=['#ff6b35','#38d6c7','#ffd166','#6fa8ff','#d889ff','#7ee081','#ff7eb6']
type CountryRecord = [string,string,string,number,number]

const featuredCities: City[] = [
  { name:'London', country:'United Kingdom', code:'GB', lat:51.507, lng:-0.128, tz:'Europe/London' },
  { name:'New York', country:'United States', code:'US', lat:40.713, lng:-74.006, tz:'America/New_York' },
  { name:'Los Angeles', country:'United States', code:'US', lat:34.052, lng:-118.244, tz:'America/Los_Angeles' },
  { name:'Chicago', country:'United States', code:'US', lat:41.878, lng:-87.63, tz:'America/Chicago' },
  { name:'Toronto', country:'Canada', code:'CA', lat:43.653, lng:-79.383, tz:'America/Toronto' },
  { name:'Vancouver', country:'Canada', code:'CA', lat:49.283, lng:-123.121, tz:'America/Vancouver' },
  { name:'Mexico City', country:'Mexico', code:'MX', lat:19.433, lng:-99.133, tz:'America/Mexico_City' },
  { name:'São Paulo', country:'Brazil', code:'BR', lat:-23.55, lng:-46.633, tz:'America/Sao_Paulo' },
  { name:'Buenos Aires', country:'Argentina', code:'AR', lat:-34.604, lng:-58.382, tz:'America/Argentina/Buenos_Aires' },
  { name:'Lima', country:'Peru', code:'PE', lat:-12.046, lng:-77.043, tz:'America/Lima' },
  { name:'Bogotá', country:'Colombia', code:'CO', lat:4.711, lng:-74.072, tz:'America/Bogota' },
  { name:'Reykjavík', country:'Iceland', code:'IS', lat:64.147, lng:-21.943, tz:'Atlantic/Reykjavik' },
  { name:'Dublin', country:'Ireland', code:'IE', lat:53.35, lng:-6.26, tz:'Europe/Dublin' },
  { name:'Lisbon', country:'Portugal', code:'PT', lat:38.722, lng:-9.139, tz:'Europe/Lisbon' },
  { name:'Madrid', country:'Spain', code:'ES', lat:40.417, lng:-3.704, tz:'Europe/Madrid' },
  { name:'Paris', country:'France', code:'FR', lat:48.857, lng:2.352, tz:'Europe/Paris' },
  { name:'Amsterdam', country:'Netherlands', code:'NL', lat:52.367, lng:4.904, tz:'Europe/Amsterdam' },
  { name:'Berlin', country:'Germany', code:'DE', lat:52.52, lng:13.405, tz:'Europe/Berlin' },
  { name:'Rome', country:'Italy', code:'IT', lat:41.903, lng:12.496, tz:'Europe/Rome' },
  { name:'Athens', country:'Greece', code:'GR', lat:37.984, lng:23.728, tz:'Europe/Athens' },
  { name:'Helsinki', country:'Finland', code:'FI', lat:60.17, lng:24.938, tz:'Europe/Helsinki' },
  { name:'Warsaw', country:'Poland', code:'PL', lat:52.23, lng:21.012, tz:'Europe/Warsaw' },
  { name:'Kyiv', country:'Ukraine', code:'UA', lat:50.45, lng:30.523, tz:'Europe/Kyiv' },
  { name:'Istanbul', country:'Türkiye', code:'TR', lat:41.008, lng:28.978, tz:'Europe/Istanbul' },
  { name:'Cairo', country:'Egypt', code:'EG', lat:30.044, lng:31.236, tz:'Africa/Cairo' },
  { name:'Lagos', country:'Nigeria', code:'NG', lat:6.524, lng:3.379, tz:'Africa/Lagos' },
  { name:'Nairobi', country:'Kenya', code:'KE', lat:-1.292, lng:36.822, tz:'Africa/Nairobi' },
  { name:'Cape Town', country:'South Africa', code:'ZA', lat:-33.925, lng:18.424, tz:'Africa/Johannesburg' },
  { name:'Dubai', country:'United Arab Emirates', code:'AE', lat:25.204, lng:55.271, tz:'Asia/Dubai' },
  { name:'Riyadh', country:'Saudi Arabia', code:'SA', lat:24.714, lng:46.675, tz:'Asia/Riyadh' },
  { name:'Delhi', country:'India', code:'IN', lat:28.614, lng:77.209, tz:'Asia/Kolkata' },
  { name:'Mumbai', country:'India', code:'IN', lat:19.076, lng:72.878, tz:'Asia/Kolkata' },
  { name:'Bangkok', country:'Thailand', code:'TH', lat:13.756, lng:100.502, tz:'Asia/Bangkok' },
  { name:'Singapore', country:'Singapore', code:'SG', lat:1.352, lng:103.82, tz:'Asia/Singapore' },
  { name:'Hong Kong', country:'Hong Kong', code:'HK', lat:22.319, lng:114.169, tz:'Asia/Hong_Kong' },
  { name:'Beijing', country:'China', code:'CN', lat:39.904, lng:116.407, tz:'Asia/Shanghai' },
  { name:'Seoul', country:'South Korea', code:'KR', lat:37.566, lng:126.978, tz:'Asia/Seoul' },
  { name:'Tokyo', country:'Japan', code:'JP', lat:35.676, lng:139.65, tz:'Asia/Tokyo' },
  { name:'Jakarta', country:'Indonesia', code:'ID', lat:-6.208, lng:106.846, tz:'Asia/Jakarta' },
  { name:'Manila', country:'Philippines', code:'PH', lat:14.6, lng:120.984, tz:'Asia/Manila' },
  { name:'Perth', country:'Australia', code:'AU', lat:-31.952, lng:115.861, tz:'Australia/Perth' },
  { name:'Sydney', country:'Australia', code:'AU', lat:-33.869, lng:151.209, tz:'Australia/Sydney' },
  { name:'Auckland', country:'New Zealand', code:'NZ', lat:-36.85, lng:174.764, tz:'Pacific/Auckland' },
  { name:'Honolulu', country:'United States', code:'US', lat:21.307, lng:-157.858, tz:'Pacific/Honolulu' },
]

export const countries = ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czechia','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','São Tomé and Príncipe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Türkiye','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe']

function approximateTimezone(lng:number){
  const offset=Math.max(-14,Math.min(12,Math.round(lng/15)))
  if(offset===0)return 'Etc/UTC'
  return `Etc/GMT${offset>0?'-':'+'}${Math.abs(offset)}`
}

type GeneratedCity = [string,string,string,number,number,string,number]
const countryRecords=generatedCountries as CountryRecord[]
const knownCountries=new Set(countries)
const featuredKeys=new Set(featuredCities.map(city=>`${city.name}|${city.country}`))
const expandedCities=(generatedCities as GeneratedCity[])
  .filter(city=>knownCountries.has(city[1])&&!featuredKeys.has(`${city[0]}|${city[1]}`))
  .map<City>(city=>({name:city[0],country:city[1],code:city[2],lat:city[3],lng:city[4],tz:city[5]}))
export const cities: City[] = [...featuredCities,...expandedCities]
countries.forEach(country=>{
  if(cities.some(city=>city.country===country))return
  const record=countryRecords.find(item=>item[0]===country || (country==='Türkiye'&&item[0]==='Turkey') || (country==='Vatican City'&&item[0]==='Vatican City'))
  if(!record)return
  cities.push({name:record[2],country,code:record[1],lat:record[3],lng:record[4],tz:approximateTimezone(record[4])})
})

const timeFormatters=new Map<string,Intl.DateTimeFormat>()
const dateFormatters=new Map<string,Intl.DateTimeFormat>()
const offsetCache=new Map<string,string>()
export function flag(code:string){ return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0))) }
export function cityTime(city: City){let formatter=timeFormatters.get(city.tz);if(!formatter){formatter=new Intl.DateTimeFormat('en-US',{timeZone:city.tz,hour:'2-digit',minute:'2-digit',hour12:false});timeFormatters.set(city.tz,formatter)}return formatter.format(new Date())}
export function cityDate(city: City){let formatter=dateFormatters.get(city.tz);if(!formatter){formatter=new Intl.DateTimeFormat('en-US',{timeZone:city.tz,weekday:'short',month:'short',day:'numeric'});dateFormatters.set(city.tz,formatter)}return formatter.format(new Date())}
export function utcOffset(city: City){const cached=offsetCache.get(city.tz);if(cached)return cached;const parts=new Intl.DateTimeFormat('en-US',{timeZone:city.tz,timeZoneName:'longOffset'}).formatToParts(new Date());const value=parts.find(p=>p.type==='timeZoneName')?.value.replace('GMT','UTC')||'UTC';offsetCache.set(city.tz,value);return value}
