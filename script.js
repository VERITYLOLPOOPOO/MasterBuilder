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

function makeShipBuildExclusive(){
  if(shipBuildService.checked){
    const conflicts=[];
    if(assemblyService.checked){assemblyService.checked=false;conflicts.push('PC Assembly');}
    if(wiringService.checked){wiringService.checked=false;conflicts.push('Wiring');}
    if(conflicts.length){alert(`Ship & Build is a complete service, so ${conflicts.join(' and ')} ${conflicts.length>1?'were':'was'} turned off.`);}
  }
  calculate();
}

shipBuildService.addEventListener('change',makeShipBuildExclusive);
assemblyService.addEventListener('change',()=>{
  if(assemblyService.checked&&shipBuildService.checked){
    shipBuildService.checked=false;
    alert('PC Assembly cannot be selected with Ship & Build. PC Assembly can be combined with Wiring.');
  }
  calculate();
});
wiringService.addEventListener('change',()=>{
  if(wiringService.checked&&shipBuildService.checked){
    shipBuildService.checked=false;
    alert('Wiring cannot be selected with Ship & Build. Wiring can be combined with PC Assembly.');
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

async function geocodeWithNominatim(lat,lon){
  const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&zoom=18`;
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error('Nominatim failed');
  const data=await response.json();
  const a=data.address||{};
  return {
    country:a.country||'',
    city:a.city||a.town||a.village||a.municipality||a.county||'',
    address:[a.house_number||'',a.road||a.pedestrian||a.residential||a.neighbourhood||a.suburb||''].filter(Boolean).join(' ').trim()||data.display_name||''
  };
}

async function geocodeWithBigDataCloud(lat,lon){
  const url=`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
  const response=await fetch(url);
  if(!response.ok) throw new Error('BigDataCloud failed');
  const data=await response.json();
  return {
    country:data.countryName||'',
    city:data.city||data.locality||data.principalSubdivision||'',
    address:[data.localityInfo?.informative?.[0]?.name||'',data.locality||''].filter(Boolean).join(', ')||data.locality||''
  };
}

async function reverseGeocode(lat,lon){
  try{return await geocodeWithNominatim(lat,lon);}catch(e){return await geocodeWithBigDataCloud(lat,lon);}
}

locateBtn.addEventListener('click',()=>{
  if(!window.isSecureContext){
    status.textContent='Location only works on the secure HTTPS version of the site.';
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
      status.textContent='Filling your address…';
      const result=await reverseGeocode(lat,lon);
      if(result.country) country.value=result.country;
      if(result.city) city.value=result.city;
      if(result.address) address.value=result.address;
      country.dispatchEvent(new Event('input',{bubbles:true}));
      city.dispatchEvent(new Event('input',{bubbles:true}));
      address.dispatchEvent(new Event('input',{bubbles:true}));
      status.textContent='Location added. Check the country, city and street address before sending.';
      locateBtn.textContent='Location added ✓';
    }catch(error){
      status.textContent=`Location found (${lat}, ${lon}), but the address lookup failed. Please type the address manually.`;
      locateBtn.textContent='Location found ✓';
    }finally{
      locateBtn.disabled=false;
    }
  },error=>{
    const messages={1:'Location permission was denied. Allow location access in your browser and try again.',2:'Your device could not determine its location.',3:'Location lookup timed out. Try again.'};
    status.textContent=messages[error.code]||'Could not get your location. Please enter the address manually.';
    locateBtn.disabled=false;
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
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