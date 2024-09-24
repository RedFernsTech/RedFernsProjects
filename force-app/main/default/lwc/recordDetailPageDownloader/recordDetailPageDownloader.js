import { LightningElement, api, wire, track } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import Id from "@salesforce/user/Id";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import brandLogo from '@salesforce/resourceUrl/Logo';
import downloadGifJS from '@salesforce/resourceUrl/DownloadGif'
import downloadImgJS from '@salesforce/resourceUrl/Download_Image'
import getFiles from '@salesforce/apex/massFileDownloader_Controller.getFiles';
import getBaseUrl from '@salesforce/apex/massFileDownloader_Controller.getBaseUrl';
import getIpAddress from '@salesforce/apex/massFileDownloader_Controller.getIpAddress';
import getUserInfo from '@salesforce/apex/massFileDownloader_Controller.getUserInfo';
import checkDownloadPermission from '@salesforce/apex/massFileDownloader_Controller.checkDownloadPermission';
import createContentDocLink from '@salesforce/apex/massFileDownloader_Controller.createContentDocLink';

export default class RecordDetailPageDownloader extends LightningElement {

    @api recordId;
    @api objectApiName;
    userId = Id;
    brandLogo = brandLogo;
    downloadGifHtml = downloadGifJS;
    downloadImgHtml = downloadImgJS;

    @track FileInfos = [];
    showNoItemsMsg = true;
    showHeader = false;
    totalRecords;
    showMoreThan500HelpText = false;
    urlForSinglePageApp;

    get recordAdvancedSearchQuery() {
        return `Id = '${this.recordId}'`;
    }

    @wire(getFiles, {
        selectedObjApiName: '$objectApiName', filterRecordByName: [], filterFileByName: '', filterFileBy: '',
        recordAdvancedSearchQuery: '$recordAdvancedSearchQuery', fileAdvSearchValue: '', listViewId: ''
    })
    getFilesInfo({ data, error }) {
        if (data) {
            this.FileInfos = JSON.parse(data);

            if (this.FileInfos.length > 0) {

                if (this.FileInfos.length > 500) {
                    this.FileInfos = this.FileInfos.slice('0', '500');
                    this.showMoreThan500HelpText = true;
                    this.urlForSinglePageApp = this.baseUrl + '/lightning/n/rft_cc__Bulk_File_Downloader';
                }

                this.showHeader = true;
                this.showNoItemsMsg = false;

                this.FileInfos.forEach(FileInfo => {
                    let fileUrl = this.baseUrl + '/lightning/r/ContentDocument/' + FileInfo.contentDocuId + '/view';
                    let tempDownloadUrl = this.baseUrl + '/sfc/servlet.shepherd/version/download/' + FileInfo.cvId;
                    FileInfo.downloadUrl = tempDownloadUrl;
                    FileInfo.fileUrl = fileUrl;
                    FileInfo.showGif = false;
                });

                this.recordsTodisplay = this.FileInfos;
                this.totalRecords = parseInt(this.FileInfos.length);
            }
            else {
                this.showNoItemsMsg = true;
            }

        }
        else if (error) {
            this.showNoItemsMsg = true;
            if (error.body && error.body.message) {
                try {
                    let message = JSON.parse(error.body.message);
                    if (message.error_description == 'authentication failure') {
                        this.showToast('Error', 'Unable to fetch the list view information. Please check your setup configuration or contact your system administrator.', 'error', 'dismissible');
                    } else if (message.error_description) {
                        this.showToast('Error', message.error_description, 'error', 'dismissible');
                    } else if (message) {
                        this.showToast('Error', message, 'error', 'dismissible');
                    }
                }
                catch (e) {
                    if (error.body.message) {
                        this.showToast('Error', error.body.message, 'error', 'dismissible');
                    } else {
                        this.showToast('Error', 'Unknown error', 'error', 'dismissible');
                    }
                }
            }
        }
    }

    get sortByOptions() {
        return [
            { label: 'File Name', value: 'FileName' },
            { label: 'Created Date', value: 'CreatedDate' },
            { label: 'Size', value: 'Size' },
        ]
    }

    displaySortByValue = 'CreatedDate';

    sortByChange(event) {
        if (event.detail.value) {
            if (event.detail.value === 'FileName') {
                this.ascOrDesvalue = 'asc';
            }
        }
        this.displaySortByValue = event.detail.value;
        this.sortData();

    }

    get ascOrDesOptions() {
        return [
            { label: 'Des', value: 'des' },
            { label: 'Asc', value: 'asc' }
        ]
    }

    ascOrDesvalue = 'des';

    ascOrDesChange(event) {
        this.ascOrDesvalue = event.detail.value;
        this.sortData();
    }

    sortData() {

        this.recordsTodisplay.sort((a, b) => {
            let valueA, valueB;

            switch (this.displaySortByValue) {
                case 'Size':
                    valueA = this.parseFileSize(a.fileSize);
                    valueB = this.parseFileSize(b.fileSize);
                    break;
                case 'CreatedDate':
                    valueA = new Date(a.createdDate);
                    valueB = new Date(b.createdDate);
                    break;
                case 'FileName':
                    valueA = a.fileName.toLowerCase();
                    valueB = b.fileName.toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (valueA < valueB) return this.ascOrDesvalue === 'asc' ? -1 : 1;
            if (valueA > valueB) return this.ascOrDesvalue === 'asc' ? 1 : -1;
            return 0;
        });
    }

    parseFileSize(sizeString) {
        const size = parseFloat(sizeString);
        if (sizeString.includes('MB')) return size * 1024 * 1024;
        if (sizeString.includes('KB')) return size * 1024;
        return size;
    }

    @track recordsTodisplay = [];
    fileNameSearchValue = '';

    handleChangeSearchFileName(event) {
        if (event.target.value) {
            this.fileNameSearchValue = event.target.value.trim();
            this.recordsTodisplay = this.FileInfos.filter(fileInfo =>
                fileInfo.fileName.toLowerCase().includes(this.fileNameSearchValue.toLowerCase())
            );
            this.checkFileCountAndShowmessage();
            this.clearFileSelection();
        }
        else {
            this.fileNameSearchValue = '';
            this.recordsTodisplay = [...this.FileInfos];
            this.checkFileCountAndShowmessage();
        }
    }

    checkFileCountAndShowmessage() {
        this.totalRecords = parseInt(this.recordsTodisplay.length);
        if (this.recordsTodisplay.length === 0) {
            this.showNoItemsMsg = true;
        }
        else {
            this.showNoItemsMsg = false;
        }
    }

    handleClickClearInput() {
        this.fileNameSearchValue = '';
        this.recordsTodisplay = [...this.FileInfos];
        this.checkFileCountAndShowmessage();
        this.clearFileSelection();
    }

    clearFileSelection() {
        const checkBoxes = this.template.querySelectorAll('[data-id="SelectFile"]');
        if (checkBoxes) {
            checkBoxes.forEach(file => {
                file.checked = false;
            });
            this.selectedFilesArray = [];
        }
    }

    @track selectedFilesArray = [];

    handleClickSelectFile(event) {
        const cvId = event.target.dataset.cvId;
        const isChecked = event.target.checked;

        if (isChecked) {
            // Check if the CVID is already in the array
            if (!this.selectedFilesArray.some(item => item.id === cvId)) {
                // If not present, add to the array
                this.selectedFilesArray.push({ id: cvId });
            }
        } else {
            // Remove from the array if unchecked
            const selectAllCheckBox = this.template.querySelector('[data-id="selectAll"]');
            if (selectAllCheckBox) {
                selectAllCheckBox.checked = false;
            }
            this.selectedFilesArray = this.selectedFilesArray.filter(item => item.id !== cvId);
        }
    }

    handleClickSelectAll(event) {
        const isChecked = event.target.checked;
        const checkBoxes = this.template.querySelectorAll('[data-id="SelectFile"]');
        if (isChecked) {
            // Add all CVIDs and file names to the selectedFilesArray
            checkBoxes.forEach(file => {
                const cvId = file.dataset.cvId;
                file.checked = true;

                // Check if the CVID is already in the array
                if (!this.selectedFilesArray.some(item => item.id === cvId)) {
                    // If not present, add to the array
                    this.selectedFilesArray.push({ id: cvId });
                }
            });
        } else {
            // Remove all CVIDs and file names from the selectedFilesArray
            checkBoxes.forEach(file => {
                file.checked = false;
            });
            this.selectedFilesArray = [];
        }
    }

    async OnClickMultiDownload() {
        if (this.selectedFilesArray.length > 0) {
            let hasDownloadAccess = await this.checkDownloadAccess();
            if (hasDownloadAccess) {
                let baseUrl = this.baseUrl + '/sfc/servlet.shepherd/version/download/';
                if (this.selectedFilesArray.length <= 500) {
                    //Construct a single download link with all IDs

                    let combinedIds = this.selectedFilesArray.map(fileInfo => fileInfo.id).join('/');
                    let finalDownloadUrl = baseUrl + combinedIds;
                    var link = document.createElement("a");
                    link.href = finalDownloadUrl;
                    link.click();
                }
                else {
                    this.showToast('Warning', 'Please select up to 500 files. You have selected more than the allowed limit.', 'warning', 'dismissible');
                }

                let filteredFiles = this.FileInfos.filter(fileInfo =>
                    this.selectedFilesArray.some(selectedFile => selectedFile.id === fileInfo.cvId)
                );

                if (filteredFiles.length > 1) {
                    const csvContent = this.createCSV(filteredFiles);
                    this.createContentVersion(csvContent);
                } else {
                    this.createDownloadLog(filteredFiles[0]?.fileName, false, filteredFiles[0]?.contentDocuId);
                }
            }
            else {
                this.showToast('Warning', 'Access to downloads is restricted. Please contact your administrator.', 'warning', 'dismissible');
            }
        } else {
            this.showToast('Warning', 'Please select a file to download.', 'warning', 'dismissible');
        }
    }

    async OnClickDownload(event) {
        const cvId = event.target.dataset.cvId;
        const downloadUrl = event.target.dataset.downloadUrl;
        const fileName = event.target.dataset.fileName;
        const docId = event.target.dataset.docId;

        let hasDownloadAccess = await this.checkDownloadAccess();
        if (hasDownloadAccess) {
            this.recordsTodisplay = this.recordsTodisplay.map(file => {
                if (file.cvId === cvId) {
                    return { ...file, showGif: true };
                }
                return file;
            });

            var link = document.createElement("a");
            link.href = downloadUrl;
            link.click();

            setTimeout(() => {
                this.recordsTodisplay = this.recordsTodisplay.map(file => {
                    if (file.cvId === cvId) {
                        return { ...file, showGif: false };
                    }
                    return file;
                });
            }, 800);

            this.createDownloadLog(fileName, false, docId);
        } else {
            this.showToast('Warning', 'Access to downloads is restricted. Please contact your administrator.', 'warning', 'dismissible');
        }
    }


    baseUrl;
    @wire(getBaseUrl)
    getBaseUrlInfo({ data, error }) {
        if (data) {
            this.baseUrl = data;
        }
        else if (error) {
        }
    }

    ipAddress = '';
    @wire(getIpAddress)
    getIpAddressInfo({ data, error }) {
        if (data) {
            this.ipAddress = data;
        }
        else if (error) {
        }
    }

    userName = '';
    userEmail = '';
    userRole = '';

    @wire(getUserInfo, ({ userId: '$userId' }))
    getUserDetails({ data, error }) {
        if (data) {
            this.userName = data.Name;
            this.userEmail = data.Email;
            this.userRole = data.UserRole.Name;
        }
        else if (error) {
        }
    }

    createDownloadLog(fileName, createdDocLink, downLoadedDocId) {
        createRecord({
            apiName: 'rft_cc__Bulk_File_Downloader_Log__c',
            fields: {
                rft_cc__Downloaded_File_Name__c: fileName,
                rft_cc__Downloaded_File_Id__c: downLoadedDocId,
                rft_cc__IP_Address__c: this.ipAddress,
                rft_cc__Downloaded_By__c: this.userId
            }
        })
            .then(result => {
                if (createdDocLink) {
                    createContentDocLink({ versionId: this.contentVersionId, recordId: result.id })
                        .then(result => {
                        })
                        .catch(error => {
                        })
                }

            })
            .catch(error => {
            })
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

    createCSV(data) {
        const headers = ['ID', 'Name', 'Related Record Id', 'Related Record Name', 'File Created By', 'File Created By Email',
            'File Created Date', 'File Size', 'File Extension', 'Downloaded By', 'Downloaded By Email Id', 'Downloaded By Role', 'IP Address'];
        const csvRows = [];

        csvRows.push(headers.join(','));

        data.forEach(item => {
            const replaceCommas = (value) => value ? value.toString().replace(',', '') : '';

            const row = [
                replaceCommas(item.contentDocuId),
                replaceCommas(item.fileName),
                replaceCommas(item.recordId),
                replaceCommas(item.recordName),
                replaceCommas(item.createdBy),
                replaceCommas(item.createdByEmail),
                replaceCommas(item.createdDate),
                replaceCommas(item.fileSize),
                replaceCommas(item.fileExtension),
                replaceCommas(this.userName),
                replaceCommas(this.userEmail),
                replaceCommas(this.userRole),
                replaceCommas(this.ipAddress)
            ];

            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    contentVersionId;

    createContentVersion(csvContent) {

        const now = new Date();
        const formattedDate = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }).format(now).replace(/\//g, '-').replace(',', '');

        let title = 'Download Report ' + formattedDate;

        const fields = {
            Title: title,
            PathOnClient: 'DownloadReport.csv',
            VersionData: btoa(csvContent),
            FirstPublishLocationId: this.userId
        };

        createRecord({ apiName: 'ContentVersion', fields })
            .then(result => {
                this.contentVersionId = result.id;
                this.createDownloadLog(title, true, null);
            })
            .catch(error => {
            });
    }

    checkDownloadAccess() {
        return checkDownloadPermission({ currentUserId: this.userId })
            .then(result => {
                return result;
            })
            .catch(error => {
                return false;
            })
    }

    handleClickCalenderly() {
        window.open('https://calendly.com/contactus-redfernstech/');
    }

    HandleLogoClick() {
        window.open('https://redfernstech.com/');
    }

    showHelpText = false;
    HoverOverToolTip = false;

    HandleOnMouseOverHelpText() {
        this.showHelpText = true;
    }

    HandleOnMouseLeaveHelpText() {

        setTimeout(() => {
            if (this.HoverOverToolTip == false) {
                this.showHelpText = false;
            }
        }, "1000");
    }

    HandleOnMouseOverToolTip() {
        this.HoverOverToolTip = true;
    }

    HandleOnMouseLeaveToolTip() {
        this.showHelpText = false;
        this.HoverOverToolTip = false;
    }
}