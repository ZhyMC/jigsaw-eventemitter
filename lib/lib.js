const assert=require("assert");
const util=require("util");
const sleep=util.promisify(setTimeout);

class LimitQueue{
	constructor(limit){
		assert(parseInt(limit)>0,"limit must > 0");

		this.queue=[];
		this.limit=limit || 100;
	}
	push(x){
		if(this.queue.length>this.limit)
			this.queue.shift();

		this.queue.push(x);
	}
	length(){
		return this.queue.length;
	}
	shift(){
		return this.queue.shift();
	}
	getAll(){
		return this.queue.concat([]);
	}
	shiftAll(){
		return this.queue.splice(0,this.queue.length);	
	}
}

class JEventEmitter{
	constructor(jigsaw,options){
		assert(jigsaw,"jigsaw must be specified");
		assert(!jigsaw.producer.ports['on'],"this jigsaw has already binded 'on' port.");
		if(!options)
			options={};

		this.options=options;
		this.jigsaw=jigsaw;
		this.handlers={};

		this.sessions={};

		//this.state="close";
		
		this.jigsaw.port("on",({event,handler})=>{
			this.on(event,handler);
			return {ok:true,binded:event,to:handler};
		});

		/*setInterval(()=>{
			console.log(Array.from(this.loops.values()),this.sessions)
		},1000);*/

		this.state="ready";

		this.loops=new Set();
	}
	close(){
		if(this.state!="ready")return;

		this.state="close";
	}
	async _startHandleLoop(jgname){
		if(this.loops.size > 500){
			delete this.sessions[jgname];
			return;
		}

		if(this.loops.has(jgname))
			return;

		this.loops.add(jgname);		
		while(this.sessions[jgname]){

			try{
				await this._handleHandler(jgname);
				await sleep(0);
			}catch(err){
				console.error(err);
			}
		}
		this.loops.delete(jgname);
	}
	_removeEventHandler(ev,handler){
		let [jgname,port]=handler.split(":");
		assert(jgname,"jgname must be specified");
		assert(port,"port must be specified");
		
		for(let jgname in this.sessions){
			if(!this.sessions[jgname][ev])
				continue;
			if(this.sessions[jgname][ev].handler==handler){
				delete this.sessions[jgname][ev];
				//console.log(jgname,"的监听器",ev,"已被销毁");

				if(Object.keys(this.sessions[jgname])<=0){
					//console.log(jgname,"的会话已被销毁");
					delete this.sessions[jgname];
				}
			}

		}
		

	}
	async _handleHandler(jgname){
		assert(typeof(jgname)=="string","event must be a string");

		let nowtime=new Date().getTime();
		let handlers=this.sessions[jgname];

		for(let ev in handlers){
			let info=handlers[ev];

			if( nowtime - info.updateTime > 10*1000){
				info.life--;
				info.updateTime=nowtime;
			}

			if(info.life<=0){
				this._removeEventHandler(ev,info.handler);
				return;
			}
			try{
				let evs=info.buf.getAll();

				if(evs.length>0){
					await this.jigsaw.send(info.handler,evs);
					info.buf.shiftAll();
				}
				else
					sleep(0);
			}catch(err){
				//console.log("发送失败")
				info.life=0;
			}

		}


	}
	_setSession(handler,event){
		let [jgname,port]=handler.split(":");
		assert(jgname,"jgname must be specified");
		assert(port,"port must be specified");
		
		if(!this.sessions[jgname]){
			this.sessions[jgname]={};
			this._startHandleLoop(jgname);
		}

		this.sessions[jgname][event]={handler,life:2,buf:new LimitQueue(100),event,updateTime:new Date().getTime()};
	}
	_pushToEventBuffer(event,data){
		for(let jgname in this.sessions){
			let sessinfo=this.sessions[jgname][event];
			if(!sessinfo)
				continue;

			sessinfo.buf.push(data);
		}
	}

	on(event,handler){
		assert(typeof(event)=="string","event must be a string");
		assert(typeof(handler)=="string","handler must be a string");

		this._setSession(handler,event);
	}
	emit(event,data){
		assert(typeof(event)=="string","event must be a string");
		assert(data,"data must be specified");

		this._pushToEventBuffer(event,data);
	}

}

module.exports=JEventEmitter;