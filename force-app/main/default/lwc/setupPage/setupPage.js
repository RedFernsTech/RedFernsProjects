import { LightningElement, wire } from 'lwc';
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import UPDATEMETADATA from '@salesforce/apex/massFileDownloader_Controller.updateMetaData';
import GETMETADATAVALUES from '@salesforce/apex/massFileDownloader_Controller.getMetaDataValues';
import image from '@salesforce/resourceUrl/Logo';


export default class SetupPage extends LightningElement {

    imageLogo = image;

    inputType1 = 'password';
    inputType2 = 'password';
    inputType3 = 'password';
    inputType4 = 'password';
    inputType5 = 'password';
    clientId = '';
    clientSecret = '';
    userName = '';
    password = '';
    securityToken = '';
    disableSubmit = false;
    disableInput = false;
    showEditButton = false;

    toggleInputType1() {
        this.inputType1 = this.inputType1 === 'password' ? 'text' : 'password';
    }

    toggleInputType2() {
        this.inputType2 = this.inputType2 === 'password' ? 'text' : 'password';
    }

    toggleInputType3() {
        this.inputType3 = this.inputType3 === 'password' ? 'text' : 'password';
    }

    toggleInputType4() {
        this.inputType4 = this.inputType4 === 'password' ? 'text' : 'password';
    }

    toggleInputType5() {
        this.inputType5 = this.inputType5 === 'password' ? 'text' : 'password';
    }

    handleChangeInput(event) {

        this.disableSubmit = false;
        if (event.target.dataset) {
            let name = event.target.dataset.name;

            if (name == 'clientid') {
                this.clientId = event.target.value;
            } else if (name == 'clientsecret') {
                this.clientSecret = event.target.value;
            } else if (name == 'username') {
                this.userName = event.target.value;
            } else if (name == 'password') {
                this.password = event.target.value;
            } else if (name == 'securitytoken') {
                this.securityToken = event.target.value;
            }
        }
    }

    handleClickSubmit() {
        if (this.validateForm()) {
            UPDATEMETADATA({ clientId: this.clientId, clientKey: this.clientSecret, userName: this.userName, word: this.password, token: this.securityToken })
                .then(response => {
                    this.disableSubmit = true;
                    this.disableInput = true;
                    this.showEditButton = true;
                    this.showToast('Success', 'Record Created Successfully', 'success', 'dismissible');
                }).catch(error => {
                    this.showToast('Error', error.body.message, 'error', 'dismissible');
                })
        }
    }

    validateForm() {
        let isValid = true;
        this.template.querySelectorAll('.setUpInput').forEach(item => {
            if (item) {
                const fieldName = item.dataset.name;
                const value = item.value.trim();
                if (!value) {
                    isValid = false;
                    switch (fieldName) {
                        case 'clientid':
                            this.showFieldError(fieldName, 'Client Id is required');
                            break;
                        case 'clientsecret':
                            this.showFieldError(fieldName, 'Client Secret is required');
                            break;
                        case 'username':
                            this.showFieldError(fieldName, 'User Name is required');
                            break;
                        case 'password':
                            this.showFieldError(fieldName, 'Password is required');
                            break;
                        case 'securitytoken':
                            this.showFieldError(fieldName, 'Security Token is required');
                            break;
                    }
                } else {
                    this.clearFieldError(fieldName);
                }
            }
        });
        return isValid;
    }

    showFieldError(fieldName, errorMessage) {
        const field = this.template.querySelector(`[data-name="${fieldName}"]`);
        const errorElement = this.template.querySelector(`[data-error-for="${fieldName}"]`);

        if (field && errorElement) {
            field.classList.add('slds-has-error');
            errorElement.textContent = errorMessage;
            errorElement.style.color = 'rgb(194, 57, 52)'; // Red color for error
        }
    }

    clearFieldError(fieldName) {
        const field = this.template.querySelector(`[data-name="${fieldName}"]`);
        const errorElement = this.template.querySelector(`[data-error-for="${fieldName}"]`);
        if (field && errorElement) {
            field.classList.remove('slds-has-error');
            errorElement.textContent = '';
        }
    }

    handleClickEdit() {
        this.disableInput = false;
    }

    @wire(GETMETADATAVALUES)
    wiredGetMetaDataValues({ data, error }) {
        if (data) {
            this.disableSubmit = true;
            this.disableInput = true;
            this.showEditButton = true;
            const mdt = JSON.parse(data);

            this.clientId = mdt.rft_cc__Client_Id__c;
            this.clientSecret = mdt.rft_cc__Client_Key__c;
            this.userName = mdt.rft_cc__User_Name__c;
            this.password = mdt.rft_cc__Paword__c;
            this.securityToken = mdt.rft_cc__Security_Token__c;
        }
        else if (error) {
        }
    }

    showToast(title, message, variant, mode) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: mode,
        });
        this.dispatchEvent(event);
    }

    connectedCallback() {
        setTimeout(() => {
            this.getsizeForCard();
        }, 20);
    }

    getsizeForCard() {
        const headerDivElement = this.template.querySelector('[data-id="parentDiv"]');
        if (headerDivElement) {
            const screenHeight = window.screen.availHeight;
            const headerDivRect = headerDivElement.getBoundingClientRect();
            const cardTopHeight = headerDivRect.top;

            let heightForcard = screenHeight - cardTopHeight;
            this.template.querySelector('[data-id="parentDiv"]').style.width = '360px';
        }
    }
}