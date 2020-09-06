const {jigsaw,domainserver} = require("jigsaw.js")("127.0.0.1","127.0.0.1");
const JEventEmitter = require("../lib/lib.js");

domainserver();

let jg=new jigsaw("test");
jg.port("call",(data)=>{
	console.log(data);
})
let emitter=new JEventEmitter(jg);

jg.on("ready",()=>{
	jg.send("test:on",{event:"testevent",handler:"test:call"}).then((ret)=>{
		console.log(ret);
		for(let i=0;i<200;i++){
			emitter.emit("testevent",{abc:233});
		}
	})
})

