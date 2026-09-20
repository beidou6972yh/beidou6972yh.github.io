export const VERSION = '0.1.0';
export const STAGES = [
  {id:'needs',name:'需求对接',group:'客户与方案',title:'需求结构化与遗漏检查',keys:['需求','量房','尺寸','预算','户型'],input:'量房记录、客户需求表、沟通纪要',output:'带出处的需求清单与缺项提醒',verify:'客户或设计师确认需求完整性',risk:'尺寸、承重、隐蔽工程必须现场核实',metric:'需求遗漏率、二次确认耗时',action:'从历史需求表抽取房间、尺寸、预算和偏好，对照必填项查漏'},
  {id:'marketing',name:'营销锁客',group:'客户与方案',title:'线索摘要与跟进建议',keys:['线索','营销','锁客','跟进','成交','客户'],input:'脱敏线索台账、跟进记录、产品知识',output:'客户摘要、跟进建议与待办',verify:'销售确认下一步行动及依据',risk:'不得虚构优惠、交期或未经授权联系客户',metric:'跟进及时率、有效线索转化率',action:'汇总客户约束与意向，按明确规则提示超期跟进'},
  {id:'design',name:'设计方案',group:'客户与方案',title:'设计需求核对与方案说明',keys:['设计','方案','效果图','图纸','材质'],input:'需求书、设计说明、选材表',output:'需求与方案差异清单、讲解草稿',verify:'设计师按原图与规范逐项复核',risk:'效果图不能替代施工图与结构校验',metric:'方案修改次数、讲解准备时间',action:'核对需求书与方案说明中的风格、材质、功能和预算约束'},
  {id:'quote',name:'报价',group:'订单工程',title:'报价核对与漏项提醒',keys:['报价','单价','折扣','计价','价格'],input:'报价表、价格规则、折扣权限表',output:'漏项、价格差异与越权折扣清单',verify:'报价员复核计算与适用版本',risk:'金额计算用确定性规则，最终价格人工确认',metric:'报价差错率、报价处理时间',action:'抽取计价项，与现行规则核对数量、版本和折扣权限'},
  {id:'review',name:'审单',group:'订单工程',title:'订单一致性与缺项审查',keys:['审单','审核','合同','订单','复核'],input:'订单、合同、报价、设计变更单',output:'跨单据差异及证据位置',verify:'审单员对差异清单逐项签核',risk:'冲突项必须阻断并由责任人裁决',metric:'漏审率、审单耗时、返工率',action:'比对客户、尺寸、材质、数量与交期，追溯变更确认记录'},
  {id:'order',name:'下单',group:'订单工程',title:'下单资料整理与录入检查',keys:['下单','录入','订单号','物料编码'],input:'已审核订单、编码字典、录入规范',output:'待录入字段与必填校验结果',verify:'下单员确认后再进入业务系统',risk:'首版试点只生成草稿，不能自动提交生产订单',metric:'录入耗时、必填缺失率',action:'将审核后的资料映射到下单模板并标记缺失字段'},
  {id:'split',name:'拆单',group:'订单工程',title:'拆单资料与工艺约束检查',keys:['拆单','板件','封边','孔位','BOM'],input:'物料清单、工艺规则、拆单异常记录',output:'物料和工艺异常候选清单',verify:'工艺工程师复核板件与加工约束',risk:'不能以语言模型替代几何运算和数控程序校验',metric:'拆单返工率、检查工时',action:'依据已知工艺规则检查清单缺项、版本和异常尺寸'},
  {id:'schedule',name:'排单',group:'订单工程',title:'交期风险与排单约束提示',keys:['排单','排产','产能','交期','工序'],input:'订单交期、产能表、工序与缺料记录',output:'交期风险解释、约束冲突列表',verify:'计划员结合真实产能确认',risk:'优化排程需专用求解器，模型负责解释与辅助',metric:'按期交付率、计划调整耗时',action:'关联缺料、工序进度和交期，发现潜在冲突'},
  {id:'production',name:'生产制造',group:'制造与交付',title:'工艺知识检索与异常归因辅助',keys:['生产','制造','设备','工艺','停机'],input:'工艺手册、设备记录、生产异常台账',output:'带出处的处理建议与异常归类',verify:'班组长或工程师核实原因',risk:'设备控制与安全操作不得由模型自行执行',metric:'异常处理时长、重复故障率',action:'检索相似异常及已验证措施，生成现场排查清单'},
  {id:'quality',name:'质检检测',group:'制造与交付',title:'质检记录分析与复检提示',keys:['质检','检测','缺陷','合格','检验'],input:'检验标准、质检台账、缺陷描述',output:'缺陷分类、重复问题与复检清单',verify:'质检员复核，视觉检测另需标注样本验证',risk:'放行判定、测量精度和安全标准必须人工或专用系统验证',metric:'漏检率、质检记录整理时间',action:'对照标准归类缺陷，识别批次和工序的重复问题'},
  {id:'logistics',name:'物流运送',group:'制造与交付',title:'发运核对与配送异常预警',keys:['物流','运送','配送','发货','签收','包装'],input:'发货清单、包装清单、物流签收记录',output:'错漏发候选、延迟与破损预警',verify:'仓配人员按实物及签收凭证核对',risk:'外部物流状态需可信接口或人工更新',metric:'错漏发率、异常响应时间',action:'核对订单与发货、签收信息，提取未闭环异常'},
  {id:'install',name:'上门安装',group:'制造与交付',title:'安装准备与问题闭环助手',keys:['安装','上门','现场','配件','验收'],input:'安装工单、配件清单、现场问题记录',output:'安装准备清单、缺件与待验收项',verify:'安装负责人和客户确认完成项',risk:'施工安全、现场尺寸与水电操作必须专业人员把关',metric:'一次安装完成率、二次上门率',action:'汇总现场条件、配件、历史问题，生成出发前核对清单'},
  {id:'service',name:'售后服务',group:'制造与交付',title:'售后工单归类与知识辅助',keys:['售后','投诉','维修','工单','保修'],input:'售后工单、保修政策、已结案案例',output:'工单分流、原因候选与回复草稿',verify:'客服核实责任及处理政策',risk:'赔付、责任归属与承诺必须人工批准',metric:'首次响应时间、重复投诉率',action:'归类问题、检索已结案处理办法，提示待收集证据'},
  {id:'behavior',name:'行为审计',group:'全链条审计',title:'操作轨迹与审批异常筛查',keys:['审批','操作','行为','权限','变更','日志'],input:'操作日志、审批链、角色权限与变更记录',output:'缺失审批、越权及异常操作候选',verify:'审计人员结合原始日志复核',risk:'异常不等于违规，保留申辩和人工调查流程',metric:'审计覆盖率、线索核查耗时',action:'按订单关联各环节的操作者、时间、版本和审批证据'},
  {id:'economic',name:'经济审计',group:'全链条审计',title:'订单成本与收支勾稽检查',keys:['成本','经济','收款','付款','发票','毛利','对账'],input:'合同、采购、成本、收付款和发票台账',output:'勾稽差异、异常成本与待核查线索',verify:'财务或审计人员核对原始凭证',risk:'线索不能直接作为舞弊、责任或正式审计结论',metric:'对账耗时、差异闭环率',action:'以订单号贯通报价、采购、生产、交付和回款，核对差异'}
];
export const DIMENSIONS = [
  {id:'data',name:'数据与知识可用性',weight:20,question:'是否有可读取、可追溯的样本与知识？非结构化材料也算。',labels:['没有可用材料','零散且难以追溯','有样本，质量不稳定','可读取、来源清楚','持续维护且质量经过检查']},
  {id:'rules',name:'作业规范明确度',weight:15,question:'处理方法、例外情况和规则版本是否明确？',labels:['依赖个人经验','有部分口头规则','有文档但例外较多','规范明确且有人维护','规则完整、版本受控']},
  {id:'output',name:'产出与验收清晰度',weight:15,question:'是否知道要生成什么、达到什么要求？',labels:['产出不明确','大致明确','有模板','有模板和验收要求','验收可量化、有历史结果']},
  {id:'repeat',name:'动作重复程度',weight:15,question:'是否存在高频、相似的读取、比对、判断或填写动作？',labels:['很少重复','偶尔重复','一部分重复','大部分重复','高频且流程稳定']},
  {id:'verify',name:'结果可复核性',weight:15,question:'谁能发现错误，是否可在影响业务前纠正？',labels:['难以判断对错','发现错误很晚','能人工抽查','有负责人逐项复核','可自动检查且有人工兜底']},
  {id:'integration',name:'实施便利度',weight:10,question:'能否先用资料导入导出试点，减少系统改造？',labels:['依赖大量系统改造','接口和权限很复杂','需要部分对接','导入导出即可试点','现有接口和权限已就绪']},
  {id:'risk',name:'风险可控程度',weight:10,question:'错误影响、敏感信息和操作权限是否可控制？',labels:['严重后果且无控制措施','高风险、控制不足','有人工审批但仍有缺口','可回退、有复核','低影响且控制经过验证']}
];
export const GOALS = ['提效','降本','增收','质量','风险控制'];
export function blankAssessment(){return {ratings:{},values:{},notes:'',roi:{}};}
export function freshState(){return {version:VERSION,demo:false,profile:{company:'',role:'部门负责人',goal:'提效',pain:''},assessments:Object.fromEntries(STAGES.map(s=>[s.id,blankAssessment()])),documents:[],messages:[],ai:null};}
export function validRating(v){return Number.isInteger(v)&&v>=1&&v<=5;}
export function score(a,goal='提效') {
  const known=DIMENSIONS.filter(d=>validRating(a?.ratings?.[d.id]));
  const weight=known.reduce((n,d)=>n+d.weight,0);
  const readiness=weight ? Math.round(known.reduce((n,d)=>n+(a.ratings[d.id]-1)/4*d.weight,0)/weight*100):null;
  const value=validRating(a?.values?.[goal]) ? (a.values[goal]-1)/4*100:null;
  const gated=(validRating(a?.ratings?.risk)&&a.ratings.risk<=2)||(validRating(a?.ratings?.verify)&&a.ratings.verify<=2);
  const priority=readiness!==null&&value!==null&&known.length>=4 ? Math.round(.7*readiness+.3*value):null;
  return {readiness,priority,coverage:weight,answered:known.length,value,gated,status:gated?'先补控制措施':priority===null?'待补充诊断':weight<100?'初步候选':priority>=70?'优先验证':priority>=45?'补齐条件后验证':'暂缓或先改流程'};
}
export function rankStages(state) {
  return STAGES.map(s=>({...s,...score(state.assessments[s.id],state.profile.goal)})).sort((a,b)=>Number(a.gated)-Number(b.gated)||(b.priority??-1)-(a.priority??-1)||b.coverage-a.coverage);
}
export function evidenceFor(stage,documents) {
  return documents.flatMap(doc=>(doc.chunks||[]).filter(c=>stage.keys.some(k=>c.text.toLowerCase().includes(k.toLowerCase()))).slice(0,2).map(c=>({sourceId:doc.id,source:doc.name,location:c.location,quote:c.text.slice(0,450)}))).slice(0,6);
}
export function nextQuestion(stage,a,documents,role) {
  if(!evidenceFor(stage,documents).length)return `您作为${role}，能否提供${stage.name}的${stage.input}？没有材料时，请描述一笔真实业务从输入到交付的过程。`;
  const missing=DIMENSIONS.find(d=>!validRating(a.ratings[d.id]));
  if(missing)return `${stage.name}：${missing.question} 请说明具体依据。`;
  if(a.ratings.verify<=2||a.ratings.risk<=2)return `如果${stage.title}出错，谁在业务生效前复核？怎样回退或阻断？`;
  return `${stage.name}每月发生多少次、每次耗时多久？${stage.metric}有没有历史基线？请区分估计值和记录值。`;
}
export function roiEstimate(r={}) {
  const names=['volume','minutes','hourly','automation','review','realization','setup','monthly','lossSaving','marginGain'];
  if(names.some(k=>r[k]===''||r[k]===undefined||r[k]===null))return {complete:false,error:'请填写全部测算参数；不涉及的金额可明确填 0。'};
  const p=Object.fromEntries(names.map(k=>[k,Number(r[k])]));
  if(Object.values(p).some(v=>!Number.isFinite(v)||v<0||v>1e12)||p.automation>100||p.realization>100)return {complete:false,error:'参数须为 0—1 万亿之间的有限数，比例须在 0—100% 之间。'};
  const calc=factor=>{
    const rate=Math.min(100,p.automation*factor)/100;
    const hours=p.volume*rate*(p.minutes-p.review)/60;
    const capacity=hours*p.hourly;
    const cashLabor=capacity<0?capacity:capacity*p.realization/100;
    const net=cashLabor+(p.lossSaving+p.marginGain)*factor-p.monthly;
    return {hours,capacity,cashLabor,net,payback:net>0?p.setup/net:null,yearNet:12*net-p.setup,yearRoi:p.setup>0?(12*net-p.setup)/p.setup*100:null};
  };
  return {complete:true,parameters:p,low:calc(.7),base:calc(1),high:calc(1.1)};
}
export function safeEndpoint(raw) {
  let u;try{u=new URL(raw);}catch{throw Error('请输入完整的模型服务网址。');}
  if(u.username||u.password||u.search||u.hash)throw Error('接口网址不能包含账户密码、查询参数或片段。');
  const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
  if(u.protocol!=='https:'&&!(local&&u.protocol==='http:'))throw Error('云端模型必须使用 HTTPS；本地部署可用 localhost HTTP。');
  if(!u.pathname.endsWith('/chat/completions'))u.pathname=u.pathname.replace(/\/$/,'')+'/chat/completions';
  return u.href;
}
export function validateAI(raw,state) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.summary!=='string')throw Error('模型未返回要求的结构化诊断，请重试或更换模型。');
  const str=v=>typeof v==='string'?v.slice(0,2000):'';
  return {summary:str(raw.summary),questions:(Array.isArray(raw.questions)?raw.questions:[]).filter(q=>typeof q==='string').slice(0,5).map(str),findings:(Array.isArray(raw.findings)?raw.findings:[]).slice(0,30).filter(f=>f&&STAGES.some(s=>s.id===f.stageId)).map(f=>{
    const doc=state.documents.find(d=>d.id===f.sourceId);
    const quote=str(f.quote);
    const chunk=quote.length>=8?doc?.chunks.find(c=>c.text.includes(quote)):null;
    return {stageId:f.stageId,observation:str(f.observation),recommendation:str(f.recommendation),quote:chunk?quote:'',sourceId:chunk?doc.id:'',source:chunk?doc.name:'',location:chunk?chunk.location:'',verified:!!chunk};
  })};
}
export function reportData(state){return {version:VERSION,createdAt:new Date().toISOString(),demo:state.demo,profile:state.profile,method:'规则初筛 v0.1：可行性70% + 所选目标价值30%；评分为用户自评，未作行业校准。风险或复核评分≤2先补控制。',stages:rankStages(state).map(s=>({...s,assessment:state.assessments[s.id],evidence:evidenceFor(s,state.documents),roi:roiEstimate(state.assessments[s.id].roi)})),ai:state.ai,messages:state.messages,limitations:['样本命中只说明相关，不证明数据质量或流程成熟。','收益区间是参数情景，非统计置信区间；工时价值不等于现金节约。','跨环节共享工时或收益不得重复加总；异常线索不构成正式审计结论。']};}
export function markdownReport(state) {
  const r=reportData(state),money=n=>Math.round(n).toLocaleString('zh-CN');
  let out=`# 家居 AI 机会诊断\n\n${r.demo?'**模拟示例，不是企业实测结果。**\n\n':''}生成时间：${r.createdAt}\n\n企业：${r.profile.company||'未填写'}；岗位：${r.profile.role}；目标：${r.profile.goal}\n\n业务问题：${r.profile.pain||'未填写'}\n\n## 方法与边界\n\n${r.method}\n\n${r.limitations.map(x=>'- '+x).join('\n')}\n`;
  for(const s of r.stages){out+=`\n## ${s.name}：${s.title}\n\n状态：${s.status}；优先分：${s.priority??'未评估'}；评分覆盖：${s.coverage}%\n\n输入：${s.input}\n\n动作：${s.action}\n\n产出：${s.output}\n\n验收：${s.verify}；指标：${s.metric}\n\n风险边界：${s.risk}\n\n自评：${DIMENSIONS.map(d=>d.name+' '+(s.assessment.ratings[d.id]??'未知')).join('；')}\n\n用户补充：${s.assessment.notes||'无'}\n`;
    out+='\n材料线索（仅相关性，不代表已验证）：\n'+(s.evidence.length?s.evidence.map(e=>`- ${e.source} / ${e.location}：${e.quote.replace(/\n/g,' ')}`).join('\n'):'- 未提供相关材料')+'\n';
    if(s.roi.complete){const b=s.roi.base;out+=`\n测算参数（用户假设）：\n\n\`\`\`json\n${JSON.stringify(s.roi.parameters,null,2)}\n\`\`\`\n\n基准月净工时：${b.hours.toFixed(1)}小时；工时价值：${money(b.capacity)}元；可兑现人工节约：${money(b.cashLabor)}元；月净收益：${money(b.net)}元；回本：${b.payback===null?'当前假设不回本':b.payback.toFixed(1)+'个月'}。\n\n保守—积极月净收益：${money(s.roi.low.net)}—${money(s.roi.high.net)}元。\n`;}
  }
  if(r.ai)out+=`\n## 模型辅助分析（待人工复核）\n\n${r.ai.summary}\n\n${r.ai.findings.map(f=>`- ${f.stageId}：${f.observation}；建议：${f.recommendation}；${f.verified?'已核对原文引用：'+f.source+' / '+f.location+' '+f.quote:'无可核对原文，仅模型建议'}`).join('\n')}\n\n待追问：\n${r.ai.questions.map(q=>'- '+q).join('\n')}\n`;
  out+='\n## 首个试点：30—90 天\n\n1. 第 1—2 周：确定一个候选场景、负责人、口径，收集历史样本并建立人工基线。\n2. 第 3—4 周：离线回放，记录准确率、漏报、复核耗时与错误后果，验收阈值由业务负责人确认。\n3. 第 5—8 周：小范围辅助运行，人工审批，记录模型、规则和数据版本。\n4. 第 9—12 周：对照实际工时、质量和全部成本复盘；达标扩大，否则调整或停止。\n';
  return out;
}
