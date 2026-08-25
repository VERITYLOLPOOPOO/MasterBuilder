const form=document.querySelector('#buildForm');
const total=document.querySelector('#total');
const bigTotal=document.querySelector('#bigTotal');
const estimateField=document.querySelector('#estimateField');
const shipping=document.querySelector('#shipping');
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

function calculate(){
  let price=Number(shipping.value);
  document.querySelectorAll('.priced:checked').forEach(item=>price+=Number(item.dataset.price));
  const formatted=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(price);
  total.textContent=formatted;
  bigTotal.textContent=formatted;
  estimateField.value=formatted;
}
form.addEventListener('change',calculate);
calculate();

pcpp.addEventListener('input',()=>{
  const value=pcpp.value.trim().toLowerCase();
  if(value && !value.includes('pcpartpicker.com')){
    pcpp.setCustomValidity('Please enter a PCPartPicker link or leave this blank and use PC Creator instead.');
    pcppHelp.textContent='This needs to be a PCPartPicker URL.';
  }else{
    pcpp.setCustomValidity('');
    pcppHelp.textContent='Already picked your parts? Paste the public list here.';
  }
});

locateBtn.addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='Location is not supported by this browser. Please enter your address instead.';return;}
  status.textContent='Requesting location…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude.toFixed(4),lon=pos.coords.longitude.toFixed(4);
    coordinates.value=`${lat}, ${lon}`;
    status.textContent='Current location added. You can leave the address fields blank.';
    locateBtn.textContent='Location added ✓';
  },()=>{status.textContent='Location permission was not granted. Please enter your address instead.';},{enableHighAccuracy:false,timeout:10000});
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
  }else{
    const hasManualAddress=country.value.trim() && city.value.trim() && address.value.trim();
    const hasLocation=coordinates.value.trim();
    if(!hasManualAddress && !hasLocation){
      message='Enter your country, city and street address, or use your current location.';
    }
  }

  if(message){
    e.preventDefault();
    alert(message);
  }
});