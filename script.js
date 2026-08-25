const form=document.querySelector('#buildForm');
const total=document.querySelector('#total');
const bigTotal=document.querySelector('#bigTotal');
const estimateField=document.querySelector('#estimateField');
const pcpp=document.querySelector('#pcpp');
const pcppHelp=document.querySelector('#pcppHelp');
const budget=document.querySelector('#budget');
const pcCreator=document.querySelector('#pcCreator');
const country=document.querySelector('#country');
const city=document.querySelector('#city');
const address=document.querySelector('#address');
const locateBtn=document.querySelector('#locateBtn');
const locationStatus=document.querySelector('#locationStatus');
const coordinates=document.querySelector('#coordinates');
const travelTier=document.querySelector('#travelTier');
const travelFee=document.querySelector('#travelFee');
const onsiteRequest=document.querySelector('#onsiteRequest');
const onsiteStatus=document.querySelector('#onsiteStatus');
const onsitePrice=document.querySelector('#onsitePrice');
const assemblyService=document.querySelector('#assemblyService');
const wiringService=document.querySelector('#wiringService');
const shipBuildService=document.querySelector('#shipBuildService');

function money(value){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);}
function calculate(){
  let price=0;
  document.querySelectorAll('.priced:checked').forEach(item=>price+=Number(item.dataset.price||0));
  if(onsiteRequest.checked) price+=Number(travelFee.value||0);
  const formatted=money(price);
  total.textContent=formatted;
  bigTotal.textContent=formatted;
  estimateField.value=formatted;
}
form.addEventListener('change',calculate);
calculate();

function enforceServices(changed){
  if(changed===shipBuildService && shipBuildService.checked){
    assemblyService.checked=false;
    wiringService.checked=false;
  }else if((changed===assemblyService||changed===wiringService) && changed.checked){
    shipBuildService.checked=false;
  }
  calculate();
}
assemblyService.addEventListener('change',()=>enforceServices(assemblyService));
wiringService.addEventListener('change',()=>enforceServices(wiringService));
shipBuildService.addEventListener('change',()=>enforceServices(shipBuildService));

pcpp.addEventListener('input',()=>{
  const value=pcpp.value.trim().toLowerCase();
  if(value&&!value.includes('pcpartpicker.com')){
    pcpp.setCustomValidity('Please enter a PCPartPicker link or leave this blank and use PC Creator instead.');
    pcppHelp.textContent='This needs to be a PCPartPicker URL.';
  }else{
    pcpp.setCustomValidity('');
    pcppHelp.textContent='If you already picked the parts, paste the public list here.';
  }
});

function setField(field,value){
  field.value=value||'';
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
}

async function bigDataCloud(lat,lon){
  const response=await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,{cache:'no-store'});
  if(!response.ok) throw new Error('BigDataCloud unavailable');
  const d=await response.json();
  return {country:d.countryName||'',countryCode:d.countryCode||'',city:d.city||d.locality||d.principalSubdivision||'',street:'',full:[d.locality,d.city,d.principalSubdivision,d.countryName].filter(Boolean).join(', ')};
}

async function arcGIS(lat,lon){
  const response=await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${encodeURIComponent(lon)},${encodeURIComponent(lat)}&distance=100&outSR=4326&f=json`,{cache:'no-store'});
  if(!response.ok) throw new Error('ArcGIS unavailable');
  const d=await response.json();
  if(d.error||!d.address) throw new Error('No ArcGIS address');
  const a=d.address;
  return {country:a.CountryCode||'',countryCode:a.CountryCode||'',city:a.City||a.Subregion||a.Region||'',street:a.Address||'',full:a.LongLabel||a.Match_addr||a.Address||''};
}

async function nominatim(lat,lon){
  const response=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&zoom=18&accept-language=en`,{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok) throw new Error('Nominatim unavailable');
  const d=await response.json(); const a=d.address||{};
  return {country:a.country||'',countryCode:(a.country_code||'').toUpperCase(),city:a.city||a.town||a.village||a.municipality||a.county||'',street:[a.house_number||'',a.road||a.pedestrian||a.residential||a.neighbourhood||a.suburb||''].filter(Boolean).join(' ').trim(),full:d.display_name||''};
}

async function reverseLocation(lat,lon){
  const results=await Promise.allSettled([bigDataCloud(lat,lon),arcGIS(lat,lon),nominatim(lat,lon)]);
  const good=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
  if(!good.length) throw new Error('No reverse geocoder responded');
  const first=(key)=>good.map(x=>x[key]).find(Boolean)||'';
  return {country:first('country'),countryCode:first('countryCode'),city:first('city'),street:first('street'),full:first('full')};
}

const AFRICA_CODES=new Set(['DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER','SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ','NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW','ESH']);
function normalize(v){return (v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function getTravel(location){
  const c=normalize(location.city); const countryName=normalize(location.country); let code=(location.countryCode||'').toUpperCase();
  if(code==='MAR') code='MA';
  if(c.includes('marrakech')||c.includes('marrakesh')) return {tier:'Marrakech',fee:50};
  if(code==='MA'||countryName.includes('morocco')||countryName.includes('maroc')) return {tier:'Elsewhere in Morocco',fee:250};
  if(AFRICA_CODES.has(code)) return {tier:'Elsewhere in Africa',fee:1500};
  return {tier:'Another continent',fee:5000};
}

locateBtn.addEventListener('click',()=>{
  if(!window.isSecureContext){locationStatus.textContent='Location requires the HTTPS version of this site.';return;}
  if(!navigator.geolocation){locationStatus.textContent='This browser does not support current-location access.';return;}
  locationStatus.textContent='Asking your device for its current location…';
  locateBtn.disabled=true;
  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=pos.coords.latitude.toFixed(6),lon=pos.coords.longitude.toFixed(6);
    coordinates.value=`${lat}, ${lon}`;
    try{
      locationStatus.textContent='Got the GPS location. Finding the address…';
      const loc=await reverseLocation(lat,lon);
      setField(country,loc.country||loc.countryCode||'Detected by GPS');
      setField(city,loc.city||'Detected by GPS');
      setField(address,loc.street||loc.full||`GPS: ${lat}, ${lon}`);
      const travel=getTravel(loc);
      travelTier.value=travel.tier;
      travelFee.value=String(travel.fee);
      onsiteRequest.disabled=false;
      onsiteStatus.textContent=`Detected: ${travel.tier}. On-site fee: ${money(travel.fee)}. Flight prices can still change the final quote.`;
      onsitePrice.textContent=money(travel.fee);
      locationStatus.textContent='Current location detected and filled in. The travel tier was calculated automatically.';
      locateBtn.textContent='Location detected ✓';
      calculate();
    }catch(error){
      setField(country,'');setField(city,'');setField(address,`GPS: ${lat}, ${lon}`);
      travelTier.value='';travelFee.value='0';onsiteRequest.checked=false;onsiteRequest.disabled=true;onsitePrice.textContent='—';
      locationStatus.textContent='Your GPS worked, but the address service could not identify your country/city. Try again in a moment.';
    }finally{locateBtn.disabled=false;}
  },error=>{
    const messages={1:'Location permission was denied. Allow location for this site in your browser and try again.',2:'Your device could not determine its current location.',3:'Location lookup timed out. Try again.'};
    locationStatus.textContent=messages[error.code]||'Could not get your current location.';
    locateBtn.disabled=false;
  },{enableHighAccuracy:true,timeout:25000,maximumAge:0});
});

form.addEventListener('submit',e=>{
  let message='';
  const usingPCPP=pcpp.value.trim(); const usingCreator=budget.value.trim();
  if(!usingPCPP&&!usingCreator){message='Paste a PCPartPicker list or open PC Creator and enter your PC budget.';pcCreator.open=true;}
  else if(shipBuildService.checked&&(assemblyService.checked||wiringService.checked)){message='Ship & Build cannot be combined with PC Assembly or Wiring.';}
  else if(!document.querySelector('.priced:checked')&&!onsiteRequest.checked){message='Choose at least one service.';}
  else if(!coordinates.value.trim()){message='Use the Current Location button first. The site uses your detected location for the address and travel tier.';}
  else if(!(country.value.trim()&&city.value.trim()&&address.value.trim())){message='Your address could not be completed from the detected location. Try the Current Location button again.';}
  if(message){e.preventDefault();alert(message);}
});