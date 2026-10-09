import {scryptSync,timingSafeEqual,randomBytes} from 'node:crypto';
import type {Account,Role,User} from '../shared/types';
import {seedUsers} from '../shared/seed';
import {LOCATIONS} from '../shared/locations';
function hash(password:string,salt:string){return scryptSync(password,salt,64).toString('hex');}
export const makeAccount={
 create(user:User,password:string,approved=true):Account{const salt=randomBytes(16).toString('hex');return {user,passwordHash:`${salt}:${hash(password,salt)}`,approved};},
 verify(password:string,encoded:string){try{const [salt,expected]=encoded.split(':');const actual=Buffer.from(hash(password,salt),'hex'),wanted=Buffer.from(expected,'hex');return actual.length===wanted.length&&timingSafeEqual(actual,wanted);}catch{return false;}},
};
export function seedAccounts():Account[]{return seedUsers.map((user,i)=>{const phone=user.role==='farmer'?user.phone:user.role==='admin'?'+91 90000 0000':`+91 90000 1${String(i-14).padStart(3,'0')}`;const password=user.role==='farmer'?'farmer123':user.role==='admin'?'admin123':'company123';return makeAccount.create({...user,phone},password,true);});}
export function newAccount(role:'farmer'|'buyer',name:string,phone:string,password:string,district:string):Account{const location=LOCATIONS.find(x=>x.district===district)!;const user:User={id:crypto.randomUUID(),role,name,phone,language:'en',village:district,district,state:location.state,lat:location.lat,lng:location.lng};return makeAccount.create(user,password,role==='farmer');}

