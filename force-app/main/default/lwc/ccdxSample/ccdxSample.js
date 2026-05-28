import { LightningElement } from 'lwc';
import STANDARD_FIELD from '@salesforce/schema/Account.Name';
import CUSTOM_FIELD from '@salesforce/schema/CustomObject__c.CustomField__c';

export default class CcdxSample extends LightningElement {

    connectedCallback() {
        console.log('Standard Field API Name: ', STANDARD_FIELD.fieldApiName);
        console.log('Custom Field API Name: ', CUSTOM_FIELD.fieldApiName);
    }
}