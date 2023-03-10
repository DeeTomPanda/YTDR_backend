import express from 'express'
import ytdl from 'ytdl-core';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import readline from 'readline';
import path from 'path';
import ffmpeG from 'ffmpeg-static';
import cp from 'child_process';
import Cors from 'cors';
import http from 'http';
import WebSocket,{ WebSocketServer } from 'ws';

//vars and funcs

const PORT=3001
const app=express()
const __dirname=path.resolve()

const server=app.listen(PORT,()=>console.log("Listening from YTD SERVERS!"))
const wsServer=new WebSocketServer({server})


//Middlewares

app.use(Cors())
app.use(express.urlencoded({extended:true}))
app.use(express.json())

//routes

wsServer.on("connection",(ws)=>{
	wsServer.on("message",(msg)=>console.log(msg))


	app.post('/getinfo',async(req,res)=>{
		console.log(req.body)
		let { yturl }=req.body
		let isValid=await ytdl.validateURL(yturl)
		console.log(isValid)
		if(!isValid)
			res.status(401).end("Invalid url")
		else{
			const info=await ytdl.getInfo(yturl)
			const AV=await ytdl.chooseFormat(info.formats,{filter:'audioandvideo'})
			console.log(AV)
			let list=[]
			let title=info.videoDetails.title
			list=info.formats.map((v,i)=>{
			   	   return {
				      title,
				      quality:v.qualityLabel?v.qualityLabel:v.audioQuality,
				      itag:v.itag,
				      mime:v.mimeType.substring(0,v.mimeType.indexOf(';'))}
			})
			res.status(201).send(list)
		}
	})	


	//To download & encode A&V 
	app.post('/getA&V',async (req,res)=>{
								//set proxy
		const { itag,ref,id,type }=req.body
		const name=(new Date()).toString()
	
		if(type.includes("video"))
		{
			var SIZE
	
			const video = await ytdl(ref,{ quality:itag })			
			const audio = await ytdl(ref, { quality: 'highestaudio' })
		
			//Encoding of video and audio
			const ffmpegProcess = cp.spawn(ffmpeG, [
	  		// Remove ffmpeg's console spamming
	  		'-loglevel', '8', '-hide_banner',
	  		// Redirect/Enable progress messages
  			'-progress', 'pipe:3',
  			// Set inputs
  			'-i', 'pipe:4',
  			'-i', 'pipe:5',
 			 // Map audio & video from streams
 	 		'-map', '0:a',
	 	 	'-map', '1:v',
  			// Keep encoding
  			'-c:v', 'copy',
  			// Define dynamic output file
  			`${id}`,				
			], {
  			windowsHide: true,
  			stdio: [
    			/* Standard: stdin, stdout, stderr */
    			'inherit', 'inherit', 'inherit',
    			/* Custom: pipe:3, pipe:4, pipe:5 */
    			'pipe', 'pipe', 'pipe',
  			],
			})

			audio.on('data',(chunk)=>{
				console.log("Audio downloading")
			})
			.on('finish',()=>console.log("Downloaded Audio"))
			video.on('data',(chunk)=>{
				console.log("Video downloading")
			})
			audio.pipe(ffmpegProcess.stdio[4])
			ffmpegProcess.stdio[4].on('drain',()=>{
				console.log(" Audio encoding")
			})
			.on('finish',()=>console.log("Downloaded video"))
			video.pipe(ffmpegProcess.stdio[5])
			ffmpegProcess.stdio[5].on('drain',()=>console.log("Video encoding"))
	
			res.setHeader("Content-Type","application/json")
	
			ffmpegProcess.stdio[3].on('data',(chunk)=>{
				const lines = chunk.toString().trim().split('\n');
  				const args = {};
  				for (const l of lines) {
    					const [key, value] = l.split('=');
    					args[key.trim()] = value.trim();
					var size=(args.total_size? (Number(args.total_size)/1000000).toFixed(2):"---")
					SIZE=size
					console.log("encoding",String(size)+"mb encoded")
		        		ws.send(size)}//
			})


			ffmpegProcess.on('exit',()=>{			//fired when cp is completed
				console.log("Downloaded & encoded")
				ffmpegProcess.kill()			//solves ffmpeg hang issues after encode
				//
				res.status(201).end("Success")}
			)
		 	ffmpegProcess.stdio[3].on('error',(err)=>{
				console.log(err)
				res.status(404).end("Server crashed! Please try again after some time")}
			)
		}
		else if(type.includes('audio'))
		{
			var audioChunk=0
			const audio =await ytdl(ref, { quality: itag })
			const mediaFile=fs.createWriteStream(id,{ highWaterMark:32000 })
			audio.pipe(mediaFile)
			.on('finish',()=>{
				console.log("Downloaded Audio")
				res.status(201).send("Audio in server")}
			)
			.on('error',(err)=>{
				console.log(err)
				res.status(404).end(err)}
			)	
			audio.on('data',(chunk)=>{
				//audioChunk=audioChunk+Number(chunk.length/1000000).toFixed(3)
				console.log("Reading")
			})

			//setInterval(()=>io.emit("audio",Number(audioChunk)),1500)
		}
		else
			res.end("Invalid format")
	
	
	})

	app.post('/download',(req,res)=>{
		console.log("Reached download")
		const { id }=req.body
		const stream=fs.createReadStream(__dirname+`/${id}`)
		res.setHeader("Content-Type","video/mp4")
		res.on('drain',(src)=>console.log("Draining data"))
		stream.pipe(res)
		.on('finish',()=>{
			fs.unlink(__dirname+`/${id}`,()=>console.log(`Removed ${id}`))
			ws.close()
			res.status(201).end()}
		)
	})

})									//Closing braces for WebScoket

app.get('/',(req,res)=>{
	res.status(201).end("There exists no such place!")}
)

