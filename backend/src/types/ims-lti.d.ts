// Type declaration for ims-lti library
declare module 'ims-lti' {
  export class Provider {
    constructor(consumerKey: string, consumerSecret: string, options?: {
      signature_method?: string;
      nonce?: () => string;
      timestamp?: () => string;
    });
    valid_request(body: any): Promise<boolean>;
  }
}
