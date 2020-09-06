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

		this.state="close";
		
		this.jigsaw.port("on",({event,handler})=>{
			this.on(event,handler);
			return {ok:true,binded:event,to:handler};
		});
	}
	close(){
		if(this.state!="ready")return;

		this.state="close";
	}
	async _startHandleLoop(ev){
		assert(this.state=="close");

		this.state="ready";
		while(this.state=="ready"){
			if(!this.handlers[ev])
				return;
			try{
				await this._handleHandler(ev);
				await sleep(0);
			}catch(err){
				console.error(err);
			}
		}
	}
	_removeEventHandler(ev,handler){
		delete this.handlers[ev][handler];
		//console.log("事件",ev,"的监听器",handler,"已被销毁");

		if(Object.keys(this.handlers[ev])<=0){
			//console.log("事件",ev,"已被销毁");
			delete this.handlers[ev];
		}
	}
	async _handleHandler(ev){
		assert(typeof(ev)=="string","event must be a string");

		let nowtime=new Date().getTime();
		let handlers=this.handlers[ev];

		for(let h in handlers){
			let info=handlers[h];
			if( nowtime - info.updateTime > 10*1000){
				info.life--;
				info.updateTime=nowtime;
			}

			if(info.life<0){
				this._removeEventHandler(ev,h);
				return;
			}
			try{
				let evs=info.queue.getAll();

				if(evs.length>0){
					await this.jigsaw.send(info.handler,evs);
					info.queue.shiftAll();
				}
				else
					sleep(0);
			}catch(err){
				console.log("发送失败")
				info.life--;
			}

		}


	}
	_hasHandler(event,handler){
		for(let h in this.handlers[event]){
			if(h==handler)
				return true;
		}
		return false;
	}

	on(event,handler){
		assert(typeof(event)=="string","event must be a string");
		assert(typeof(handler)=="string","handler must be a string");

		if(!this.handlers[event]){
			this.handlers[event]={};
			this._startHandleLoop(event);
		}
		
		//assert(!this._hasHandler(event,handler),"this event already has this handler");
		if(this._hasHandler(event,handler))
			this.handlers[event][handler].life=5;
		else
			this.handlers[event][handler]={event,handler,life:5,queue:new LimitQueue(this.options.queuelen || 100),updateTime:new Date().getTime()};
	}
	emit(event,data){
		assert(typeof(event)=="string","event must be a string");
		assert(data,"data must be specified");

		let handlers=this._getHandlers(event);

		for(let h in handlers){
			handlers[h].queue.push(data);
		}

	}
	_getHandlers(event){
		assert(typeof(event)=="string","event must be a string");

		if(!this.handlers[event])
			return {};
		return Object.values(this.handlers[event]);
	}


}

module.exports=JEventEmitter;