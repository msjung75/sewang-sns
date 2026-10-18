export function replacePassage(body:string,passage:string,replacement:string):string {
 if(!passage.trim())throw new Error('바꿀 원문을 입력하세요.');
 const first=body.indexOf(passage);
 if(first<0)throw new Error('현재 원고에서 원문을 찾지 못했습니다. 수정할 부분을 그대로 복사해 주세요.');
 if(first!==body.lastIndexOf(passage))throw new Error('같은 문장이 여러 곳에 있습니다. 앞뒤 문장을 더 포함해 수정할 위치를 구분하세요.');
 const result=body.slice(0,first)+replacement+body.slice(first+passage.length);
 if(result.length>30000)throw new Error('원고는 30,000자 이내로 저장할 수 있습니다.');
 return result;
}
export function appendPassage(body:string,addition:string):string {
 if(!addition.trim())throw new Error('추가할 내용을 입력하세요.');
 const result=body+(body?(body.endsWith('\n\n')?'':body.endsWith('\n')?'\n':'\n\n'):'')+addition;
 if(result.length>30000)throw new Error('원고는 30,000자 이내로 저장할 수 있습니다.');
 return result;
}
