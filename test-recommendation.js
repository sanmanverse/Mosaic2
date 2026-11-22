import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, normalizeVector, cosineSimilarity, scoreArticle, rankArticles, deriveTaste } from './src/lib/recommendation.js';

const vector = {technology:60,science:10,business:10,society:10,arts_culture:10};
const story = (id, composition=vector, topics=['AI']) => ({id,author_id:'writer-a',composition,topics,created_at:new Date().toISOString()});

test('five dimensions are present and normalization sums to one',()=>{
  assert.equal(CATEGORIES.length,5);
  const normalized=normalizeVector(vector);
  assert.ok(Math.abs(normalized.reduce((a,b)=>a+b,0)-1)<1e-10);
});

test('cosine similarity ranks identical vectors at 100',()=>{
  assert.equal(cosineSimilarity(vector,vector),100);
  assert.ok(cosineSimilarity(vector,{technology:0,science:0,business:0,society:0,arts_culture:100})<100);
});

test('ranker excludes read stories and low-similarity content',()=>{
  const same=story('same');
  const unrelated=story('unrelated',{technology:0,science:0,business:0,society:0,arts_culture:100});
  const result=rankArticles([same,unrelated],{...vector,topics:['AI']},['same']);
  assert.deepEqual(result.map(x=>x.id),[]);
  assert.equal(scoreArticle(same,{...vector,topics:['AI']}).similarity,100);
});

test('ranker prioritizes a followed writer with otherwise equal content',()=>{
  const a=story('a');const b={...story('b'),author_id:'writer-b'};
  const result=rankArticles([b,a],{...vector,topics:['AI'],followedWriters:['writer-a']});
  assert.equal(result[0].id,'a');
});

test('taste derivation uses positive reading signals and returns five dimensions',()=>{
  const result=deriveTaste([story('a')],[{article_id:'a',event_type:'complete'}],{});
  assert.equal(CATEGORIES.reduce((sum,c)=>sum+result[c.key],0),100);
  assert.equal(result.technology,60);
});

import { validateComposition, normalizeUsername } from './src/lib/content-validation.js';
test('composition validation requires five bounded integer values totalling 100',()=>{
  assert.equal(validateComposition(vector).valid,true);
  assert.equal(validateComposition({...vector,technology:99}).valid,false);
  assert.equal(validateComposition({...vector,technology:60.5}).valid,false);
  assert.equal(validateComposition({...vector,technology:101}).valid,false);
});
test('username normalization removes unsupported characters and caps length',()=>{
  assert.equal(normalizeUsername('Sanman Tiwari!'),'sanmantiwari');
  assert.equal(normalizeUsername('a'.repeat(40)).length,24);
});
test('taste blend keeps percentages summing to 100 for uneven signals',()=>{
  const a=story('a',{technology:33,science:17,business:19,society:21,arts_culture:10});
  const result=deriveTaste([a],[{article_id:'a',event_type:'read'}],{technology:10,science:20,business:30,society:20,arts_culture:20,topics:[]});
  assert.equal(CATEGORIES.reduce((sum,c)=>sum+result[c.key],0),100);
  assert.ok(result.business>10);
});
