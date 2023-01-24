from transformers import AutoTokenizer, AutoModel
from transformers import GPT2LMHeadModel, GPT2Tokenizer, GPT2Model
import torch
import time
# from ratelimiter import RateLimiter

class EmbeddingService(object):
  cos = torch.nn.CosineSimilarity(dim=0)
  model: GPT2Model
  tokenizer: GPT2Tokenizer
  def __init__(self, modelId, device='cpu'):
    #Load AutoModel from huggingface model repository
    
    # mps for macos is also seems supported, but it not work with GPT2 based models, with predictions.
    self.device = torch.device(device)
    self.tokenizer = AutoTokenizer.from_pretrained(modelId, use_fast=True) # AutoTokenizer.from_pretrained(modelId)
    self.model = AutoModel.from_pretrained(modelId).to(self.device)# AutoModel.from_pretrained(modelId).to(self.device)
    # self.hmodel = GPT2LMHeadModel.from_pretrained(modelId).to(self.device)# AutoModel.from_pretrained(modelId).to(self.device)
    # self.model.parallelize()
    
    print('using', torch.get_num_threads())

  #Mean Pooling - Take attention mask into account for correct averaging
  def mean_pooling(self, model_output, attention_mask):
      token_embeddings = model_output[0] #First element of model_output contains all token embeddings
      input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
      sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
      sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
      return sum_embeddings / sum_mask
  
  # @RateLimiter(max_calls=10)
  def embeddings(self, sentences):
    #Tokenize sentences
    st = time.time()
    encoded_input = self.tokenizer(sentences, truncation=True, return_tensors='pt').to(self.device)
    
    print('token', len(sentences), len(encoded_input), len(encoded_input[0]))
    
    try:
      mi = self.model.wpe.num_embeddings
      if len(encoded_input[0]) > mi:
        raise Exception("This model's maximum context length is " + str(mi) + " tokens, however you requested " + str(len(encoded_input[0])) + " tokens")
    except:
      pass
    try:
      mi = self.model.embeddings.position_embeddings.num_embeddings
      if len(encoded_input[0]) > mi:
        raise Exception("This model's maximum context length is " + str(mi) + " tokens, however you requested " + str(len(encoded_input[0])) + " tokens")
    except:
      pass
    #Compute token embeddings
    with torch.no_grad():
        model_output = self.model(**encoded_input)

    #Perform pooling. In this case, mean pooling
    sentence_embeddings = self.mean_pooling(model_output, encoded_input['attention_mask'])
    ed = time.time()
    
    print('token', len(sentences), len(encoded_input), len(encoded_input[0]), ' time', (ed-st))
    
    return [sentence_embeddings[0], len(encoded_input[0])]

  def completion(self, text, do_sample=True, temperature=1.3, max_length=2048, **kwargs):
    input_ids = self.tokenizer.encode(text, return_tensors="pt").to(self.device)
    out = self.model.generate(input_ids, do_sample=do_sample, temperature=temperature, max_length=max_length, **kwargs) 

    return list(map(self.tokenizer.decode, out))[0]

  def compare(self, e1, e2):
    return self.cos(e1, e2)