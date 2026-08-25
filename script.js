const form=document.querySelector('#buildForm');
const total=document.querySelector('#total');
const bigTotal=document.querySelector('#bigTotal');
const estimateField=document.querySelector('#estimateField');
const onsite=document.querySelector('#onsite');
const pcpp=document.querySelector('#pcpp');
const pcppHelp=document.querySelector('#pcppHelp');
const budget=document.querySelector('#budget');
const pcCreator=document.querySelector('#pcCreator');
const country=document.querySelector('#country');
const city=document.querySelector('#city');
const address=document.querySelector('#address');
const locateBtn=document.querySelector('#locateBtn');
const status=document.querySelector('#locationStatus');
const coordinates=document.querySelector('#coordinates');
const assemblyService=document.querySelector('#assemblyService');
const wiringService=document.querySelector('#wiringService');
const shipBuildService=document.querySelector('#shipBuildService');

function calculate(){
  let price=Number(onsite?.value||0);
  document.querySelectorAll('.priced:checked').forEach(item=>price+=Number(item.dataset.price));
  const formatted=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(price);
  total.textContent=formatted;
  bigTotal.textContent=formatted;
  estimateField.value=formatted;
}
form.addEventListener('change',calculate);
calculate();

function turnOffShipBuild(message){
  if(shipBuildService.checked){
    shipBuildService.checked=false;
    alert(message);
  }
}

shipBuildService.addEventListener('change',()=>{
  if(shipBuildService.checked){
    const conflicts=[];
    if(assemblyService.checked){assemblyService.checked=false;conflicts.push('PC Assembly');}
    if(wiringService.checked){wiringService.checked=false;conflicts.push('Wiring');}
    if(conflicts.length){
      alert(`Ship & Build is its own complete service, so ${conflicts.join(' and ')} ${conflicts.length>1?'were':'was'} turned off.`);
    }
  }
  calculate();
});

assemblyService.addEventListener('change',()=>{
  if(assemblyService.checked){
    turnOffShipBuild('PC Assembly cannot be combined with Ship & Build. PC Assembly + Wiring is allowed.');
  }
  calculate();
});

wiringService.addEventListener('change',()=>{
  if(wiringService.checked){
    turnOffShipBuild('Wiring cannot be combined with Ship & Build. Wiring + PC Assembly is allowed.');
  }
  calculate();
});

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

async function geocodeWithArcGIS(lat,lon){
  const url=`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${encodeURIComponent(lon)},${encodeURIComponent(lat)}&distance=100&outSR=4326&f=json`;
  const response=await fetch(url,{mode:'cors'});
  if(!response.ok) throw new Error('ArcGIS failed');
  const data=await response.json();
  if(data.error||!data.address) throw new Error('ArcGIS returned no address');
  const a=data.address;
  const street=a.Address||a.Match_addr||'';
  return {
    country:a.CountryCode||'',
    city:a.City||a.Subregion||a.Region||'',
    address:street,
    full:a.LongLabel||a.Match_addr||street
  };
}

async function geocodeWithBigDataCloud(lat,lon){
  const url=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
  const response=await fetch(url,{mode:'cors'});
  if(!response.ok) throw new Error('BigDataCloud failed');
  const data=await response.json();
  return {
    country:data.countryName||data.countryCode||'',
    city:data.city||data.locality||data.principalSubdivision||'',
    address:'',
    full:[data.locality,data.city,data.principalSubdivision,data.countryName].filter(Boolean).join(', ')
  };
}

async function reverseGeocode(lat,lon){
  try{
    return await geocodeWithArcGIS(lat,lon);
  }catch(firstError){
    return await geocodeWithBigDataCloud(lat,lon);
  }
}

function setField(field,value){
  if(!value) return;
  field.value=value;
  field.dispatchEvent(new Event('input',{bubbles:true}));
  field.dispatchEvent(new Event('change',{bubbles:true}));
}

locateBtn.addEventListener('click',()=>{
  if(!window.isSecureContext){
    status.textContent='Location only works on the HTTPS version of this site.';
    return;
  }
  if(!navigator.geolocation){
    status.textContent='Your browser does not support location. Please enter the address manually.';
    return;
  }

  status.textContent='Finding your current location…';
  locateBtn.disabled=true;

  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=pos.coords.latitude.toFixed(6);
    const lon=pos.coords.longitude.toFixed(6);
    coordinates.value=`${lat}, ${lon}`;

    try{
      status.textContent='Turning your GPS location into an address…';
      const result=await reverseGeocode(lat,lon);

      setField(country,result.country);
      setField(city,result.city);
      setField(address,result.address||result.full||`GPS location: ${lat}, ${lon}`);

      // If a provider only knows the area and not the exact street, keep a precise GPS fallback.
      if(!country.value.trim()) country.value='Location detected';
      if(!city.value.trim()) city.value='Location detected';
      if(!address.value.trim()) address.value=`GPS location: ${lat}, ${lon}`;

      status.textContent='Location filled in. Please check the address before submitting.';
      locateBtn.textContent='Location added ✓';
    }catch(error){
      // Never throw away a successful GPS fix just because reverse geocoding failed.
      if(!country.value.trim()) country.value='Location detected';
      if(!city.value.trim()) city.value='Location detected';
      address.value=`GPS location: ${lat}, ${lon}`;
      status.textContent='GPS location added. Exact street lookup was unavailable, so please check or edit the address.';
      locateBtn.textContent='Location added ✓';
    }finally{
      locateBtn.disabled=false;
    }
  },error=>{
    const messages={
      1:'Location permission was denied. Allow location access for this site and try again.',
      2:'Your device could not determine its current location.',
      3:'Location lookup timed out. Try again.'
    };
    status.textContent=messages[error.code]||'Could not get your location. Please enter the address manually.';
    locateBtn.disabled=false;
  },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
});

form.addEventListener('submit',e=>{
  let message='';
  const usingPCPP=pcpp.value.trim();
  const usingCreator=budget.value.trim();

  if(!usingPCPP&&!usingCreator){
    message='Paste a PCPartPicker list or open PC Creator and enter your PC budget.';
    pcCreator.open=true;
  }else if(!document.querySelector('.priced:checked')&&Number(onsite.value)===0){
    message='Choose a service or an on-site assembly option before sending your request.';
  }else if(shipBuildService.checked&&(assemblyService.checked||wiringService.checked)){
    message='Ship & Build cannot be combined with PC Assembly or Wiring.';
  }else if(!(country.value.trim()&&city.value.trim()&&address.value.trim())){
    message='Enter your country, city and street address, or use your current location to fill them automatically.';
  }

  if(message){
    e.preventDefault();
    alert(message);
  }
});