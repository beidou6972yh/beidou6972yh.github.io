import {SOURCES,INDUSTRY_QUESTIONS} from './industry.js';
import {STAGES} from './core.js';
// Project-authored applications of cited background, never normative clauses.
export const KNOWLEDGE=STAGES.map(s=>({id:'workflow-'+s.id,stage:s.id,title:s.name+'：诊断起点',text:`输入：${s.input}；AI动作候选：${s.action}；输出：${s.output}；追问：${INDUSTRY_QUESTIONS[s.id]}；验证：${s.verify}；风险：${s.risk}`,sourceIds:['chain',...(['quality','production'].includes(s.id)?['wood','emissions','safety']:['design'])],kind:'项目编写的场景知识，需用户核实',keys:[s.name,...s.keys]}));
export const DATASETS=[{title:'CLINC150：24条训练样本',url:'https://github.com/clinc/oos-eval',text:'CC BY 3.0；英文意图与域外识别参考。原始域外标签不能直接迁移到家居行业。',file:'data/clinc-sample.json'},{title:'SGD：34条用户对话样本',url:'https://github.com/google-research-datasets/dstc8-schema-guided-dialogue',text:'CC BY-SA 4.0；保留上一轮上下文和原始对话动作。仅作方法参考，未训练分类模型。',file:'data/sgd-sample.json'}];
export function searchKnowledge(query,limit=4){
 const terms=String(query||'').toLowerCase();
 return KNOWLEDGE.map(k=>({...k,score:k.keys.filter(t=>terms.includes(t.toLowerCase())).length})).filter(k=>k.score>0).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(15,limit))).map(k=>({...k,sources:SOURCES.filter(s=>k.sourceIds.includes(s.id))}));
}
export const PLAYBOOKS=[
 {id:'furniture-interview',title:'岗位与意愿访谈',instructions:'每轮只问一个问题；先了解岗位和最希望改善的一件事。询问是否用过AI及具体用法，不根据职级猜测。新手用业务实例解释，熟悉者讨论系统边界。信息够用先给暂定场景，缺口按需追问。保留用户否认、纠正和不知道；所有推断待确认。'},
 {id:'evidence-value',title:'证据与价值判断',instructions:'区分用户原话、文件证据、公开背景和推断。标准元数据不等于完整条款，行业统计不代填企业ROI。节省工时不等于现金收益，列出假设、成本、复核责任和试点验收。使用现有S/A/B/C/D分级规则，不因用户表达积极而提级。'},
 {id:'continuity-memory',title:'持续服务记忆',instructions:'只把用户明确确认且仍适用的信息作为稳定事实；记录来源、确认时间和适用范围。用户纠正后旧信息标为被替代。推断、暂定方案与确认事实分开。读取旧记忆先核实变化；不跨用户检索，不把样本中的确认当授权。'}
];
