// Isolated, synthetic preview only. Production always uses the fixed staging API.
export function approvalOrigin(){
 const value=process.env.SEWANG_LOCAL_REVIEW_ORIGIN;
 if(process.env.NODE_ENV==='development'&&value&&/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(value))return value;
 return 'https://sewang-ai-queue-staging.msjung75.workers.dev';
}
