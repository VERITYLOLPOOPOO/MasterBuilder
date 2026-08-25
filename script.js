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
const status=document.querySelector('#locationStatus');
const coordinates=document.querySelector('#coordinates');
const assemblyService=document.querySelector('#assemblyService');
const wiringService=document.querySelector('#wiringService');
const shipBuildService=document.querySelector('#shipBuildService');

function calculate(){
  let price=0;
  document.querySelectorAll('.priced:checked').forEach(item=>price+=Number(item.dataset.price));
  const formatted=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(price);
  total.textContent=formatted;
  bigTotal.textContent=formatted;
  estimateField.value=formatted;
}
form.addEventListener('change',calculate);
calculate();

function normalize(value){return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function isMarrakech(value){const v=normalize(value);return v.includes('marrakech')||v.includes('marrakesh');}

shipBuildService.addEventListener('change',()=>{
  if(shipBuildService.checked && wiringService.checked){
    wiringService.checked=false;
    alert('Ship & Build cannot be selected together with Wiring.');
  }
  calculate();
});

wiringService.addEventListener('change',()=>{
  if(wiringService.checked && shipBuildService.checked){
    shipBuildService.checked=false;
    alert('Wiring and Ship & Build cannot be selected together.');
  }
  calculate();
});

pcpp.addEventListener('input',()=>{
  const value=pcpp.value.trim().toLowerCase();
  if(value && !value.includes('pcpartpicker.com')){
    pcpp.setCustomValidity('Please enter a PCPartPicker link or leave this blank and use PC Creator instead.');
    pcppHelp.textContent='This needs to be a PCPartPicker URL.';
  }else{
    pcpp.setCustomValidity('');
    pcppHelp.textContent='If you already picked the parts, paste the public list here.';
  }
});

async function reverseGeocode(lat,lon){
  const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&zoom=18`;
  const response=await fetch(url,{headers:{'Accept':'application/json'}});
  if(!response.ok) throw new Error('Address lookup failed');
  return response.json();
}

locateBtn.addEventListener('click',()=>{
  if(!navigator.geolocation){
    status.textContent='Location is not supported by this browser. Please enter your address manually.';
    return;
  }

  status.textContent='Finding your location…';
  locateBtn.disabled=true;

  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=pos.coords.latitude.toFixed(6);
    const lon=pos.coords.longitude.toFixed(6);
    coordinates.value=`${lat}, ${lon}`;

    try{
      status.textContent='Looking up your address…';
      const data=await reverseGeocode(lat,lon);
      const a=data.address||{};
      country.value=a.country||'';
      city.value=a.city||a.town||a.village||a.municipality||a.county||'';
      const road=a.road||a.pedestrian||a.residential||a.neighbourhood||a.suburb||'';
      const house=a.house_number||'';
      address.value=[house,road].filter(Boolean).join(' ').trim() || data.display_name || '';
      status.textContent='Address filled from your current location. Please check it before submitting.';
      locateBtn.textContent='Location added ✓';
    }catch(error){
      status.textContent='Location found, but the street address could not be filled automatically. Please enter the address manually.';
      locateBtn.textContent='Location found ✓';
    }finally{
      locateBtn.disabled=false;
    }
  },()=>{
    status.textContent='Location permission was not granted. Please enter your address manually.';
    locateBtn.disabled=false;
  },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
});

form.addEventListener('submit',e=>{
  let message='';
  const usingPCPP=pcpp.value.trim();
  const usingCreator=budget.value.trim();

  if(!usingPCPP && !usingCreator){
    message='Paste a PCPartPicker list or open PC Creator and enter your PC budget.';
    pcCreator.open=true;
  }else if(!document.querySelector('.priced:checked')){
    message='Choose at least one service before sending your request.';
  }else if(shipBuildService.checked && wiringService.checked){
    message='Ship & Build and Wiring cannot be selected together.';
  }else if(assemblyService.checked && !isMarrakech(city.value)){
    message='PC Assembly is available only for customers in Marrakech. Choose Ship & Build if you are outside Marrakech.';
  }else{
    const hasAddress=country.value.trim() && city.value.trim() && address.value.trim();
    if(!hasAddress){
      message='Enter your country, city and street address, or use your current location to fill them automatically.';
    }
  }

  if(message){
    e.preventDefault();
    alert(message);
  }
});