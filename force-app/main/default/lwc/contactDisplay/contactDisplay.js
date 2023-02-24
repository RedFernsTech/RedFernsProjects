import { LightningElement } from 'lwc';
import {ShowToastEvent} from 'lightning/platformShowToastEvent';
import Contact_Object from '@salesforce/schema/Contact';
import Account_Name_Field from '@salesforce/schema/Contact.AccountId';
import First_Name_Field from '@salesforce/schema/Contact.FirstName';
import Last_Name_Field from '@salesforce/schema/Contact.LastName';
import Mobile_Field from '@salesforce/schema/Contact.MobilePhone';
import Work_Phone_Field from '@salesforce/schema/Contact.Work_Phone__c';
import Status_Field from '@salesforce/schema/Contact.Status__c';
import Title_Field from '@salesforce/schema/Contact.Title';
import Email_Field from '@salesforce/schema/Contact.Email';
import User_Level_Field from '@salesforce/schema/Contact.User_Level__c';

export default class ContactDisplay extends LightningElement {
    objectName = Contact_Object;
    fieldList = [Account_Name_Field,First_Name_Field,Last_Name_Field,Mobile_Field,Work_Phone_Field,Status_Field,Title_Field,Email_Field,User_Level_Field]
    successHandler(event){
        console.log(event.detail.id);
        const toastEvent = new ShowToastEvent({
            title:"Contact created",
            message:"RecordId:"+event.detail.id,
            variant:"success"
        });
        this.dispatchEvent(toastEvent);
    }
    handleError(event){
        console.log(event.detail);
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error creating record',
                message: event.detail.message,
                variant: 'error',
            }),
        );
    }
}