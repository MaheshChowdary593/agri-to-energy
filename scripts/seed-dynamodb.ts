import {DynamoStore} from '../src/backend/dynamo-store';

if(process.env.USE_AWS!=='true')throw new Error('Set USE_AWS=true before running this seed script.');
if(!process.env.AWS_REGION&&!process.env.AWS_DEFAULT_REGION)throw new Error('Set AWS_REGION first.');
const store=new DynamoStore();
store.seedDemoData().then(()=>console.log('Seeded demo users, listings, demands and matches into DynamoDB.')).catch(error=>{console.error('DynamoDB seed failed:',error);process.exitCode=1;});

