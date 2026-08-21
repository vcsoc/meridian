const fs = require('node:fs')
const path = require('node:path')
const { cities } = require('world-cities-json')
const tzlookup = require('tz-lookup')

const normalizedCountry = name => name === 'Turkey' ? 'Türkiye' : name
const selected = cities.slice(0, 16000).map(entry => {
  const lat = Number(entry.lat)
  const lng = Number(entry.lng)
  return [entry.city, normalizedCountry(entry.country), entry.iso2, lat, lng, tzlookup(lat, lng), Number(entry.population) || 0]
})
fs.writeFileSync(path.join(__dirname, '../src/cities.generated.json'), JSON.stringify(selected))
console.log(`Generated ${selected.length.toLocaleString()} cities.`)
