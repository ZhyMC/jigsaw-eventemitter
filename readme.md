## Jigsaw-EventEmitter 文档

### 1.1 简介
  
Jigsaw-EventEmitter是一个Jigsaw.js的附加组件，    
提供让Jigsaw实例成为一个事件触发器的功能，类似于消息队列MQ。    
   
### 1.2 安装
   
在项目下运行如下命令   
> npm install jigsaw-eventemitter  

即可安装     
   
请注意，```jigsaw-eventemitter```依赖```jigsaw.js```   
    
### 1.3 特性
    
该事件触发器的实现是基于Jigsaw的，意味着Jigsaw实例可以向外触发事件数据。    
内部有一个事件缓冲器，即使大量的事件同时被触发也可以被缓冲后发送。      

### 1.4 用途
可以用于制造各式各样的，基于事件的服务。    
    
一个经典的例子是使用Jigsaw-EventEmitter绑定到一个Jigsaw实例上，    
之后可以向这个emitter一直emit码流数据事件，所有绑定者都可以对等的收到码流数据。    
    
但因为这个EventEmitter是实现在网络中的，实现码流的复制将会十分的简单。    
     
另一个经典的例子是，一个服务专门提供一个设备状态的改变，然后对外报告事件，  
所有监听者都可以对这些事件做出自己的反应，监听者可以是网络中的任何一个节点，   
只要你想使用就可以注册，十分方便。    
   
   
### 2.1 用法及实例
   
#### 2.1.1 简单例子
   
   
door.js   
```
const {jigsaw}=require("jigsaw.js")("127.0.0.1","127.0.0.1");
const JEventEmitter=require("jigsaw-eventemitter");

let door=new Door(); // Door class designed by yourself

let jg=new jigsaw("door");

let emitter=new JEventEmitter(jg);

door.on("open",()=>{
	emitter.emit("open");
})
door.on("close",()=>{
	emitter.emit("close");
})



```
   
alarm.js
```
const {jigsaw}=require("jigsaw.js")("127.0.0.1","127.0.0.1");

let jg=new jigsaw("alarm");

jg.port("ondooropen",()=>{
	console.log("you must be noticed that the door is opened!!!");
});
jg.port("ondoorclose",()=>{
	console.log("the door is closed");
});

async function listen(){
	await jg.send("door:on",{event:"open",handler:"alarm:ondooropen"});
	await jg.send("door:on",{event:"close",handler:"alarm:ondoorclose"});
}
jg.on("ready",()=>{
	listen();
	setInterval(listen,10000); 

	//请注意，监听器每10秒至少再次监听一次作为心跳，否则emitter之后会销毁这个监听器
})


```
    
该例子演示了一个网络中的警报器，以及这个警报器是怎么通过网络监听门的状态的    
     
### 3.1 API文档
   
#### 3.1.1 JEventEmitter.prototype.constructor(jigsaw,option)
    
该方法为JEventEmitter的构造器    
第一个参数为jigsaw，传递一个jigsaw的实例，之后该jigsaw的on接口会被注册并使用。    
第二个参数是可选的，是一个配置信息，其中    
    
```
option.queuelen : 代表内部的缓冲区大小，默认为100

```
#### 3.1.2 JEventEmitter.prototype.emit(event,data)
    
该方法触发一个事件，所有监听器都会接收到该事件。    
     
event代表事件名，data代表事件要携带的数据。     
    
#### 3.1.3 Jigsaw接口 on(event,handler)
   
本实例会使得构造器传入的jigsaw注册并占用一个jigsaw接口：on，其他jigsaw可以直接调用此接口来注册成为一个事件的监听器。      
    
其中event代表要注册并监听的事件名，handler是一个jigsaw路径，一般是指向自己的一个jigsaw接口的路径。    
    
若注册的对应事件被触发，handler设定的该jigsaw接口会收到事件的数据。    

