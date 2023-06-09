import { db } from "../database/database.config.js"
import dayjs from "dayjs";
import { ObjectId} from "mongodb";

export async function createPoll(req,res){
    const {title, expireAt} = req.body;
    if(expireAt === ""){
        const datePlusThirty = dayjs();
        datePlusThirty = datePlusThirty.add(30, 'day');
        expireAt = datePlusThirty.format('YYYY-MM-DD HH:mm');
        console.log(expireAt);
    }
    try{
        const newPoll = {
            title: title,
            expireAt: expireAt
        }

        await db.collection("polls").insertOne(newPoll);
        res.sendStatus(201)
    }
    catch(err){
        res.status(500).send(err.message);
    }
}


export async function getPolls(req,res){ 
    try{
        const pollsList = await db.collection("polls").find().toArray();
        res.send(pollsList);
    }
    catch(error){
        res.status(500).send(error.message);
    }
}


export async function createChoice(req,res){
    const {title, pollId} = req.body;

    const pollToModify = await db.collection("polls").findOne({_id: new ObjectId(pollId)}); // nonexisting poll validation
    if(!pollToModify){
        return res.sendStatus(404);
    }
    try{

        const titleRepeat = await db.collection("choices").findOne(req.body); // repeated title validation
        if(titleRepeat){
            return res.sendStatus(409);
        }
        
        const pollExpiredAt = dayjs(pollToModify.expireAt); // finished polls validation
        if (pollExpiredAt.isBefore(dayjs())){
            return res.sendStatus(403);
        }

        
        const newChoice = {
            title: title,
            pollId: pollId
        }
        await db.collection("choices").insertOne(newChoice);
        return res.status(201).send(newChoice); 
    }
    catch(err){
        res.status(500).send(err.message);
    }
} 


export async function getChoices(req,res){
    const {id} = req.params;
    try{
        const choiceList = await db.collection("choices").find({ pollId: id}).toArray();
        if(!choiceList){
            return res.sendStatus(404);
        }
        return res.send(choiceList);
    }
    catch(err){
        res.status(500).send(err.message);
    }
}


export async function postVote(req, res){
    const {id} = req.params;

    try{
        const choiceSelected = await db.collection("choices").findOne({ _id: new ObjectId(id)});
        if(!choiceSelected){ // vote option exists validation
            return res.sendStatus(404);
        }

        const now = dayjs();
        const pollSelected = await db.collection("polls").findOne({_id: new ObjectId(choiceSelected.pollId)});
        const pollExpiredAt = dayjs(pollSelected.expireAt); // finished polls validation
        if (pollExpiredAt.isBefore(now)){
            return res.sendStatus(403);
        }

        let voteCounter = (await db.collection("votes").find({choiceId: id}).toArray()).length;
        voteCounter +=1;
        const vote = {
            votedAt: now.format("YYYY-MM-DD HH:mm"),
            pollId: pollSelected._id.toString(),
            pollTitle: pollSelected.title,
            choiceId: id ,
            choiceTitle: choiceSelected.title,
            voteNumber: voteCounter
        }
        await db.collection("votes").insertOne(vote);
        return res.sendStatus(201);
    }
    catch(err){
        res.status(500).send(err.message);
    }
}


export async function getVotes(req,res){
    const {id} = req.params;

    const pollSelected = await db.collection("polls").findOne({_id: new ObjectId(id)});
    if(!pollSelected){
        return res.sendStatus(404);
    }

    let mostVoteds = await db.collection("votes").find({pollId: id}).sort({voteNumber: 1}).toArray();
    let mostVoted = mostVoteds[mostVoteds.length-1];
    let result = {
        _id: mostVoted.choiceId,
	    title: mostVoted.pollTitle,
	    expireAt: pollSelected.expireAt,
	    result : {
            title: mostVoted.choiceTitle,
            votes: mostVoted.voteNumber
	    }
    }
    return res.send(result);
}