// Server-side only. This file is for a serverless host such as Vercel.
// GitHub Pages will serve the site, but it cannot securely execute this file.
// Put OPENAI_API_KEY in the hosting provider's environment variables.

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  if(!process.env.OPENAI_API_KEY) return res.status(503).json({error:'Compatibility AI is not configured'});

  const input=req.body||{};
  const prompt=`You are a PC hardware compatibility checker for Cardboard PCs.\nCheck ONLY hardware compatibility and realistic fit/power concerns. Be conservative: if exact model dimensions or socket details are missing, call it a warning rather than claiming certainty.\nReturn JSON only in this exact shape:\n{"severity":"compatible|warning|incompatible","issues":[{"level":"compatible|warning|incompatible","text":"short explanation"}]}\n\nBuild request:\n${JSON.stringify(input)}`;

  try{
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`
      },
      body:JSON.stringify({model:'gpt-5.6-luna',input:prompt})
    });
    if(!response.ok){
      const detail=await response.text();
      return res.status(502).json({error:'OpenAI request failed',detail:detail.slice(0,300)});
    }
    const data=await response.json();
    const text=(data.output||[]).flatMap(item=>item.content||[]).find(part=>part.type==='output_text')?.text||'';
    const cleaned=text.replace(/^```json\s*/i,'').replace(/```$/,'').trim();
    const parsed=JSON.parse(cleaned);
    if(!parsed||!Array.isArray(parsed.issues)) throw new Error('Invalid compatibility response');
    return res.status(200).json(parsed);
  }catch(error){
    return res.status(500).json({error:'Compatibility check failed'});
  }
}
