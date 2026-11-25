// External adapters must supply these capabilities after provider-specific sandbox validation.
export class IntegrationUnavailable extends Error{constructor(provider){super(`${provider}: integration not configured`);this.code='integration_unavailable';}}
export class OperatorAdapter{
 constructor({kind,provider='not_configured'}){this.kind=kind;this.provider=provider;}
 capabilities(){return {kind:this.kind,provider:this.provider,state:'unavailable',live:false,booking:false};}
 async schedules(){throw new IntegrationUnavailable(this.provider);}
 async quote(){throw new IntegrationUnavailable(this.provider);}
 async book(){throw new IntegrationUnavailable(this.provider);}
 async submitDocument(){throw new IntegrationUnavailable(this.provider);}
 async verifyWebhook(){throw new IntegrationUnavailable(this.provider);}
}
export const adapters={ferry:new OperatorAdapter({kind:'sea'}),rail:new OperatorAdapter({kind:'rail'}),customs:new OperatorAdapter({kind:'customs'})};
