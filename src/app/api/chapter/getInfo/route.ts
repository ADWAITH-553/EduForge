import { prisma } from "@/lib/db";
import { strict_output } from "@/lib/gpt";
import { getQuestionsFromTranscript, getTranscript, searchYoutube } from "@/lib/youtube";
import { NextResponse } from "next/server";
import { z } from "zod";

// const sleep=async()=> new Promise((resolve)=>{
//     setTimeout(resolve,Math.random()*4000);
// })
const bodyParser=z.object({
    chapterId:z.string()
})
export async function POST(req:Request,res:Response){
    try {
        //await sleep();
        const body=await req.json()
        const {chapterId}=bodyParser.parse(body)

        const chapter=await prisma.chapter.findUnique({
            where:{
                id:chapterId,
            }
        })
        if(!chapter){
            return NextResponse.json({
                success:false,error:"Chapter not found"
            },{status:404})
        }
    //console.log(chapter.youtubeSearchQuery)
    const videoId=await searchYoutube(chapter.youtubeSearchQuery)
    let transcript=await getTranscript(videoId)
    console.log(videoId)
    console.log(transcript)
    let maxLength=150
    transcript = transcript.split(" ").slice(0, maxLength).join(" ");
    const { summary }: { summary: string } = await strict_output(
        "You are an AI capable of summarising a youtube transcript",
        "summarise in 75 words or less and do not talk of the sponsors or anything unrelated to the main topic, also do not introduce what the summary is about.\n" +
          transcript,
        { summary: "summary of the transcript" }
      );
    //   const questions=await getQuestionsFromTranscript(transcript,chapter.name)
    //   await prisma.question.createMany({
    //     data:questions.map(question=>{
    //         let options=[question.answer,question.option1,question.option2,question.option3]
    //         options=options.sort(()=>Math.random()*0.5)
    //         return {
    //             question:question.question,
    //             answer:question.answer,
    //             options:JSON.stringify(options),
    //             chapterId:chapterId
    //         }
    //     })
    //   })
      await prisma.chapter.update({
        where:{id:chapterId},
        data:{
            videoId:videoId,
            summary:summary
        }
      })
      return NextResponse.json({videoId,transcript,summary})
} catch (error) {
        if(error instanceof z.ZodError){
            return NextResponse.json({
                success:false,
                error:"Invalid body"
            },{status:400})
            
        }
        else{
            console.log(error)
            return NextResponse.json({
                success:false,
                error:"unknown"
            })
        }
    
        
    }
}