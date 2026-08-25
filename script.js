const form=document.querySelector('#buildForm');
const total=document.querySelector('#total');
const bigTotal=document.querySelector('#bigTotal');
const estimateField=document.querySelector('#estimateField');
const shipping=document.querySelector('#shipping');
const pcpp=document.querySelector('#pcpp');
const pcppHelp=document.querySelector('#pcppHelp');

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
    pcpp.setCustomValidity('Please enter a PCPartPicker link.');
    pcppHelp.textContent='This needs to be a PCPartPicker URL.';
  }else{
    pcpp.setCustomValidity('');
    pcppHelp.textContent='Paste the public link to your parts list.';
  }
});

const locateBtn=document.querySelector('#locateBtn');
const status=document.querySelector('#locationStatus');
const coordinates=document.querySelector('#coordinates');
locateBtn.addEventListener('click',()=>{
  if(!navigator.geolocation){status.textContent='Location is not supported by this browser.';return;}
  status.textContent='Requesting location…';
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude.toFixed(4),lon=pos.coords.longitude.toFixed(4);
    coordinates.value=`${lat}, ${lon}`;
    status.textContent='Location added to your request.';
    locateBtn.textContent='Location added ✓';
  },()=>{status.textContent='Location permission was not granted. You can enter your city manually.';},{enableHighAccuracy:false,timeout:10000});
});

form.addEventListener('submit',e=>{
  if(!document.querySelector('.priced:checked')){
    e.preventDefault();
    alert('Choose at least one service before sending your request.');
  }
});