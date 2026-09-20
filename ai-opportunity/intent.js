// Conservative, explainable hints; not a trained classifier or permission engine.
export const INTENT_EXAMPLES=[
 ['我希望AI帮我核对报价','goal'],['每天审单太费时间','pain'],['我不知道AI能做什么','ai-help'],['我没用过AI','ai-help'],['不是销售，我负责审单','correction'],['刚才说错了，每月是200单','correction'],['不要自动下单','boundary'],['客户资料不能上传','boundary'],['这个数字我不确定','uncertain'],['先给我举个例子','clarification'],['可以，但只能用脱敏文件','conditional'],['方案不错，预算还没批','conditional'],['我用过AI写文案','experience'],['我会用API接模型','experience'],['不想节省人手，只想降低返工','correction'],['没有系统接口','boundary'],['还不知道谁负责复核','uncertain'],['能解释一下知识库吗','clarification']
].map(([utterance,label],i)=>({id:'home-'+i,utterance,label,source:'项目自建合成样例',license:'MIT',realUser:false}));
const rules=[['correction',/说错了|更正|不是.{0,20}[，,是]|不想.{0,20}只想/],['boundary',/不要|不能|不允许|没有.{0,8}接口/],['uncertain',/不确定|不清楚|不知道|还没/],['clarification',/解释|举个例子|什么意思/],['conditional',/但是|但只|只能|前提|预算还没/],['goal',/希望|想让|帮我/],['ai-help',/没用过AI|不知道AI|不懂AI/i],['experience',/用过AI|用AI|API/i]];
export function analyzeIntent(text){
 text=String(text||'').slice(0,8000);
 const hints=rules.flatMap(([label,re])=>{if(label==='experience'&&/没用过AI|不用AI|不会用AI|不懂API/i.test(text))return [];const m=text.match(re);return m?[{label,evidence:m[0],status:'待确认',method:'词语提示，可能误判'}]:[];});
 return {hints,unknown:!hints.length,authorization:false,nextQuestion:hints.some(h=>h.label==='ai-help')?'您希望先看一个与您工作有关的AI例子，还是直接说说最麻烦的一件事？':hints.some(h=>h.label==='correction')?'我按您刚才的更正理解，哪些原有信息需要作废？':null};
}
