export interface SQLAgentQueryRequest
{   
    sessionId : number;
    query : string;
    llmId : number;
    connectionId : number;
}