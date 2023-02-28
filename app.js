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
import { Server } from 'socket.io';

const PORT=8080
const app=express()
const __dirname=path.resolve()

const server=app.listen(PORT,()=>console.log("Listening from YTD SERVERS!"))

const io=new Server(server,{
	cors:{origin:"*"}
})

server.setTimeout(1800000,()=>console.log("Time's up!"))

//Middlewares

app.use(Cors())
app.use(express.urlencoded({extended:true}))
app.use(express.json())

//routes

io.on("connection",(socket)=>console.log("User connected"))

app.post('/getinfo',async(req,res)=>{
	console.log(req.body)
	let { yturl }=req.body
	let isValid=await ytdl.validateURL(yturl)
	console.log(isValid)
	if(!isValid)
		res.status(401).end("Invalid url")
	else{
		const info=await ytdl.getInfo(yturl)
		let list=[]
		let title=info.videoDetails.title
		list=info.formats.map((v,i)=>{
			if(v.qualityLabel)
		   	   return {
			      title,
			      quality:v.qualityLabel,
			      itag:v.itag,
			      mime:v.mimeType.substring(0,v.mimeType.indexOf(';'))}
			else
		  	   return {
			     title,
			     quality:v.audioQuality,
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
		const video=await ytdl(ref,{ quality:itag })			
		const audio =await ytdl(ref, { quality: 'highestaudio' })
	
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

		audio.pipe(ffmpegProcess.stdio[4]);
		video.pipe(ffmpegProcess.stdio[5]);

		res.setHeader("Content-Type","application/json")

		ffmpegProcess.stdio[3].on('data',(chunk)=>{
			const lines = chunk.toString().trim().split('\n');
  			const args = {};
  			for (const l of lines) {
    				const [key, value] = l.split('=');
    				args[key.trim()] = value.trim();
				let size=(args.total_size? (Number(args.total_size)/1000000).toFixed(2) : "---")
				io.emit("data",String(size))}
		})
		.on('end',()=>{
			console.log("Downloaded & encoded")
			res.status(201).end("Success")}
		)
		.on('error',(err)=>{
			console.log(err)
			res.status(404).end("Server crashed! Please try again after some time")}
		)
	}
	else if(type.includes('audio'))
	{
		const audio =await ytdl(ref, { quality: itag })
		const mediaFile=fs.createWriteStream(id)
		audio.pipe(mediaFile)
		.on('readable',(data)=>console.log("Piping"))
		.on('finish',()=>{
			console.log("Downloaded Audio")
			res.status(201).end("Success")}
		)
		.on('error',(err)=>{
			console.log(err)
			res.status(404).end(err)}
		)
	}
	else
		res.end("Invalid format")
	
	
})

app.post('/download',(req,res)=>{
	const { id }=req.body
	const stream=fs.createReadStream(__dirname+`/${id}`)
	res.setHeader("Content-Type","video/mp4")
	stream.pipe(res)
	.on('finish',()=>{
		io.disconnect(true)
		fs.unlink(__dirname+`/${id}`,()=>console.log(`Removed ${id}`))
		res.status(201).end()}
	)
})

app.get('/',(req,res)=>{
	res.status(201).end("There exists no such place!")}
)
