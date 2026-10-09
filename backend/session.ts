import {store} from '../backend/repository';
import type {User} from '../shared/types';
export async function requestUser(req:Request):Promise<User|null>{const raw=req.headers.get('cookie')??'',token=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith('khetloop_session='))?.slice('khetloop_session='.length);return token?store.session(token):null;}

