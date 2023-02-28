import express from 'express';
import Cors from 'cors';
import fs from 'fs'
import https from 'https';
import path from 'path';
import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';
import pretty from 'pretty';
import puppeteer from 'puppeteer';

const app=express()
const __dirname=path.resolve()

app.use(Cors())


app.get('/',async(req,res)=>{
	const url='https://www.instagram.com/reel/Cof1hP2MudU/?utm_source=ig_web_copy_link'
		//'https://www.instagram.com/reel/CoZ-gFBpMX-/?utm_source=ig_web_copy_link'
	
	const browser=await puppeteer.launch()
	const page=await browser.newPage()
	.then(async(page)=>{
		await page.goto(url,{ waitUntil: 'networkidle0' })
		await page.waitForSelector('video',{visible:true})
		await page.evaluate(async()=>{
			const ele=await document.querySelectorAll('video[src]')
			console.log(ele,"HI")}
		)
		const content=await page.content()
		//fs.writeFile(`${path.resolve()}/URL.txt`,pretty(content),(err)=>console.log(err))
		let $=await cheerio.load(content)
		let item=$('video').attr()
		console.log(item.src)
		const url_=item.src
		const wStream=fs.createWriteStream(path.resolve()+"/InstaVideo.mp4")
		https.get(url_,(resp)=>{
			resp.pipe(wStream)
			.on('data',()=>console.log("started"))
			.on('finish',()=>{
				res.end("Downloaded")
				console.log("finished")}
			)
			.on('error',(err)=>console.log(err))
		})
		

	})
})

app.get('/downloads',async(req,res)=>{
	const url= 'https://instagram.fmaa2-1.fna.fbcdn.net/o1/v/t16/f1/m82/D24291580DAF429F227833F64E6EFEA6_video_dashinit.mp4?efg=eyJxZV9ncm91cHMiOiJbXCJpZ193ZWJfZGVsaXZlcnlfdnRzX290ZlwiXSIsInZlbmNvZGVfdGFnIjoidnRzX3ZvZF91cmxnZW4uNzIwLmNsaXBzLmJhc2VsaW5lIn0&_nc_ht=instagram.fmaa2-1.fna.fbcdn.net&_nc_cat=106&vs=585358566425337_4053616319&_nc_vs=HBksFQIYT2lnX3hwdl9yZWVsc19wZXJtYW5lbnRfcHJvZC9EMjQyOTE1ODBEQUY0MjlGMjI3ODMzRjY0RTZFRkVBNl92aWRlb19kYXNoaW5pdC5tcDQVAALIAQAVABgkR0JZMEtBZkhqYU5IbzF3RUFLYnNubHJMVWlJWGJwUjFBQUFGFQICyAEAKAAYABsAFQAAJoirnZHbyus%2FFQIoAkMzLBdAL4gxJul41RgSZGFzaF9iYXNlbGluZV8xX3YxEQB1%2FgcA&ccb=9-4&oh=00_AfBLbFNMsLBYgwb6SAwULspfm46HD6br9Z5ImWhRleKATw&oe=63E8F61F&_nc_sid=30a2ef'  
		//"https://www.instagram.com/reel/CoZ9ny4A8Xloc9MQs0xmrNk-Jt1eWJ3oFVtS-c0/"
		/*"https://instagram.fmaa2-2.fna.fbcdn.net/v/t66.30100-16/322421065_548275650612275_7450641886273300260_n.mp4?efg=eyJ2ZW5jb2RlX3RhZyI6InZ0c192b2RfdXJsZ2VuLjEwODAuY2xpcHMuYmFzZWxpbmUiLCJxZV9ncm91cHMiOiJbXCJpZ193ZWJfZGVsaXZlcnlfdnRzX290ZlwiXSJ9&_nc_ht=instagram.fmaa2-2.fna.fbcdn.net&_nc_cat=111&_nc_ohc=DkYSZ6h_V2QAX8Ir_Wn&edm=AJ9x6zYBAAAA&vs=574708984688834_2397237248&_nc_vs=HBksFQAYJEdFbkJOeE16ekdSZnAtSUJBQ1JuOXdOUy0yVm5icFIxQUFBRhUAAsgBABUAGCRHQ2x2M3hJV3lDaUd5YmtCQUN5ZlhoZUluYmg2YnBSMUFBQUYVAgLIAQAoABgAGwAVAAAm4PjpkNql3z8VAigCQzMsF0A7szMzMzMzGBZkYXNoX2Jhc2VsaW5lXzEwODBwX3YxEQB1%2FgcA&ccb=7-5&oh=00_AfA8i5MgbJxu4TP3hAD5roZqSxk1sul5VpMKWGw8PObEUQ&oe=63E897CD&_nc_sid=cff2a4"*/
	console.log("At /")
	const stream=fs.createWriteStream(__dirname+"/Video.mp4")
	await https.get(url,(resp)=>{
		console.log(resp)
		resp.pipe(stream)
		.on('data',()=>console.log('started'))
		.on('finish',()=>{
			console.log("done")
			res.end()}
		)
		.on('error',(err)=>{
			//res.end()
			console.log(err)}
		)
	})
	//res.end()
})

app.listen(8000,()=>console.log("listening"))
