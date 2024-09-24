import { LightningElement, track, wire } from 'lwc';
import { createRecord } from 'lightning/uiRecordApi';
import Id from "@salesforce/user/Id";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import brandLogo from '@salesforce/resourceUrl/Logo';
import instagramLogo from '@salesforce/resourceUrl/InstagramLogo';
import linkedInLogo from '@salesforce/resourceUrl/LinkedInLogo';
import youtubeLogo from '@salesforce/resourceUrl/YoutubeLogo';
import facebookLogo from '@salesforce/resourceUrl/FacebookLogo';
import getFiles from '@salesforce/apex/massFileDownloader_Controller.getFiles';
import getObjNames from '@salesforce/apex/massFileDownloader_Controller.getObjectsName';
import downloadGifJS from '@salesforce/resourceUrl/DownloadGif'
import downloadImgJS from '@salesforce/resourceUrl/Download_Image'
import getListViewInfo from '@salesforce/apex/massFileDownloader_Controller.getListView';
import getUsers from '@salesforce/apex/massFileDownloader_Controller.getUsers';
import getBaseUrl from '@salesforce/apex/massFileDownloader_Controller.getBaseUrl';
import getUserInfo from '@salesforce/apex/massFileDownloader_Controller.getUserInfo';
import checkRecordAdvSearchQuery from '@salesforce/apex/massFileDownloader_Controller.checkRecordAdvSearchQuery';
import checkFileAdvSearchQuery from '@salesforce/apex/massFileDownloader_Controller.checkFileAdvSearchQuery';
import getMetaDataValues from '@salesforce/apex/massFileDownloader_Controller.getMetaDataValues';
import getIpAddress from '@salesforce/apex/massFileDownloader_Controller.getIpAddress';
import checkDownloadPermission from '@salesforce/apex/massFileDownloader_Controller.checkDownloadPermission';
import createContentDocLink from '@salesforce/apex/massFileDownloader_Controller.createContentDocLink';
import getRecordNamesForSearchBar from '@salesforce/apex/massFileDownloader_Controller.getRecordNamesForSearchBar';

export default class MassFileDownloader extends LightningElement {

    brandLogo = brandLogo;
    instagramLogo = instagramLogo;
    linkedInLogo = linkedInLogo;
    youtubeLogo = youtubeLogo;
    facebookLogo = facebookLogo;
    userId = Id;

    //Handles the Pin functionality
    pinState = true;
    divSticky = 'sticky';
    HandleOnPin() {
        this.pinState = !this.pinState;
        if (!this.pinState) {
            this.divSticky = '';
        }
        else {
            this.divSticky = 'sticky';
        }
    }

    //Handle on the Select Object input field value change - Displays the dropdown with list of objects from the org
    showObjList = false;
    showSearchBarSpinnner = false;
    showDataLoadSpinner = false;
    searchText;
    @track objNames;
    selectedObjApiName = null;
    HandleOnSearchTextChange(event) {
        this.showObjList = true;
        this.showSearchBarSpinnner = true;
        this.searchText = event.detail.value;
        setTimeout(() => {
            this.getObjNamesList(event);
        }, 500);
    }

    //Supplies the list object to the Select object input fields dropdown by calling the getObjectsName method from massFileDownloader_Controller
    getObjNamesList(event) {
        if (event.detail.value) {
            getObjNames({ searchText: this.searchText })
                .then(result => {
                    if (result.length > 0) {
                        this.objNames = [...result].sort((a, b) => a.Label.localeCompare(b.Label));
                        this.showSearchBarSpinnner = false;
                    }
                    else {
                        this.showObjList = false;
                        this.showSearchBarSpinnner = false;
                    }
                })
                .catch(error => {
                    this.showObjList = false;
                    this.showSearchBarSpinnner = false;
                })
        }
        else {
            this.showObjList = false;
            this.showSearchBarSpinnner = false;
        }
    }

    //When the object name is clicked from the Select object field dropdown call the getFiles function
    HandleOnObjClick(event) {

        this.showDataLoadSpinner = true;
        this.resetFilter();
        this.showObjList = false;
        this.searchText = this.objNames[event.currentTarget.dataset.id].Label;
        this.selectedObjApiName = this.objNames[event.currentTarget.dataset.id].QualifiedApiName;
        this.loadFileType = true;
        this.recAdvSearchLabel = 'SELECT Id, Name FROM ' + this.selectedObjApiName + ' WHERE';
        this.isFilterDisabled = false;
        //Filters the list view options based on the selected object
        this.completeReset();
        this.callFromSearch = false;
        this.getFiles(this.selectedObjApiName, this.filterRecordByIds, this.filterFileByName, this.filterFileBy, this.recordAdvancedSearchQuery, this.fileAdvSearchValue, this.listViewId);
        this.listViewOptions = [];

        this.listViewInfo.data.forEach(lv => {
            if (lv.SobjectType == this.selectedObjApiName) {
                let tempLvObj = { label: lv.Name, value: lv.Id };
                this.listViewOptions.push(tempLvObj);
            }
        })
        this.handleCheckboxSelectAll(false);
    }

    //Gets the file info based on the Input fields under Filter based on record > Search
    showRecNameList = false;
    showSearchNameSpinnner = false;
    filterRecordByIds = [];
    listViewInfo;
    @track listViewOptions = [];
    listViewId;
    selectedListView;
    @track matchingRecords = [];
    filterRecordByMultipleNameInput = '';

    HandleOnRecNameChange(event) {
        if (event.detail.value) {
            this.showRecNameList = true;
            this.showSearchNameSpinnner = true;
            this.filterRecordByMultipleNameInput = event.detail.value.toLowerCase().trim();

            getRecordNamesForSearchBar({ recordName: this.filterRecordByMultipleNameInput, selectedObject: this.selectedObjApiName })
                .then(result => {
                    let response = JSON.parse(result);
                    if (response.length > 0) {
                        this.matchingRecords = response;
                        this.showSearchNameSpinnner = false;
                    }
                    else {
                        this.showRecNameList = false;
                        this.showSearchNameSpinnner = false;
                    }
                })
                .catch(error => {
                    this.showRecNameList = false;
                    this.showSearchNameSpinnner = false;
                })
        }
        else {
            this.matchingRecords = [];
            this.showRecNameList = false;
            this.showSearchNameSpinnner = false;
        }
    }

    handleFocusRecNameInput() {
        if (this.filterRecordByMultipleNameInput === 'Multiple Records Selected') {
            this.filterRecordByMultipleNameInput = '';
        }
    }

    selectedRecordOnNameSearch = [];
    disableRecNameSearchDone = true;

    handleClickRecordNameAdd(event) {
        const recordId = event.currentTarget.dataset.id;
        if (recordId) {
            const record = this.matchingRecords.find(rec => rec.recordId === recordId);
            if (record) {
                record.isSelected = !record.isSelected;
                if (record.isSelected) {
                    if (!this.selectedRecordOnNameSearch.some(rec => rec.recordId === recordId)) {
                        this.selectedRecordOnNameSearch.push(record);
                    }
                } else {
                    this.selectedRecordOnNameSearch = this.selectedRecordOnNameSearch.filter(
                        selected => selected.recordId !== recordId
                    );
                }
            }

            if (this.selectedRecordOnNameSearch.length > 0) {
                this.disableRecNameSearchDone = false;
            }
            else {
                this.disableRecNameSearchDone = true;
            }
        }
    }

    selectedRecordNames = '';

    handleClickDoneRecName() {
        if (this.selectedRecordOnNameSearch.length > 0) {
            if (this.selectedRecordOnNameSearch.length > 1) {
                this.filterRecordByMultipleNameInput = 'Multiple Records Selected';
            }

            this.pillObjArray.forEach(poa => {
                if (poa.key == 'recAdvSearch') {
                    poa.value = '';
                }
                if (poa.key == 'ListViewName') {
                    poa.value = '';
                }
            })

            this.checkForPillAvailability();
            this.recordAdvancedSearchQuery = '';
            this.tempRecordAdvancedSearchQuery = '';
            this.listViewId = '';
            this.selectedListView = '';
            this.filterRecordByIds = this.selectedRecordOnNameSearch.map(record => record.recordId);
            this.selectedRecordNames = this.selectedRecordOnNameSearch.map(record => record.recordName);

            this.checkPillValues('RecordName', 'Record Name = ', this.selectedRecordNames);
        }
        this.showRecNameList = false;
    }

    handleClickCancelRecName() {
        this.showRecNameList = false;
        this.matchingRecords = [];
        this.selectedRecordOnNameSearch = [];
        this.filterRecordByMultipleNameInput = '';
    }

    //Gets all the list view options for all the object by calling the getListView from the massFileDownloader_Controller
    @wire(getListViewInfo)
    wiredGetListViewInfo(data, error) {
        if (data) {
            this.listViewInfo = data;
        }
        else if (error) {
        }
    }

    HandleListViewOptionChange(event) {
        this.listViewId = event.detail.value;

        this.selectedListView;
        this.listViewOptions.forEach(lv => {
            if (lv.value == this.listViewId) {
                this.selectedListView = lv.label;
                return;
            }
        })
        this.pillObjArray.forEach(poa => {
            if (poa.key == 'RecordName') {
                poa.value = '';
            }
            if (poa.key == 'recAdvSearch') {
                poa.value = '';
            }
        })
        this.filterRecordByIds = [];
        this.filterRecordByMultipleNameInput = '';
        this.matchingRecords = [];
        this.selectedRecordOnNameSearch = [];
        this.tempRecordAdvancedSearchQuery = ''
        this.recordAdvancedSearchQuery = '';

        this.checkPillValues('ListViewName', 'List View = ', this.selectedListView);
    }

    recAdvSearchLabel = 'SELECT Id, Name FROM '
    tempRecordAdvancedSearchQuery = ''
    recordAdvancedSearchQuery = '';

    handleOnRecordAdvancedSearch(event) {
        this.tempRecordAdvancedSearchQuery = event.detail.value;
    }

    showRecordAdvSearchError = false;
    recordError = '';
    handleClickAddRecordAdvanceSearch() {
        let query = 'SELECT Id FROM ' + this.selectedObjApiName + ' WHERE ' + this.tempRecordAdvancedSearchQuery;
        checkRecordAdvSearchQuery({ query })
            .then(result => {
                this.showRecordAdvSearchError = false;
                if (result == 'Valid') {
                    this.pillObjArray.forEach(poa => {
                        if (poa.key == 'RecordName') {
                            poa.value = '';
                        }
                        if (poa.key == 'ListViewName') {
                            poa.value = '';
                        }
                    })
                    this.recordAdvancedSearchQuery = this.tempRecordAdvancedSearchQuery;
                    this.checkPillValues('recAdvSearch', 'Record Advanced Search  = ', this.recordAdvancedSearchQuery);
                    this.filterRecordByIds = [];
                    this.filterRecordByMultipleNameInput = '';
                    this.matchingRecords = [];
                    this.selectedRecordOnNameSearch = [];
                    this.listViewId = '';
                    this.selectedListView = '';
                } else {
                    this.showRecordAdvSearchError = true;
                    this.recordError = result;
                }
            })
    }

    //Gets the file info based on the Input fields under Filter based on files > Search
    filterFileByName = null;

    HandleOnFileNameChange(event) {
        this.pillObjArray.forEach(poa => {
            if (poa.key == 'fileAdvSearch') {
                poa.value = '';
            }
        })
        this.checkForPillAvailability();
        this.fileAdvSearchValue = '';
        this.tempFileAdvSearchValue = '';

        this.filterFileByName = event.detail.value;
        this.checkPillValues('FileName', 'File Name = ', this.filterFileByName);
    }

    //Displays the diffrent input fields based on the selection from the input field under Filter based on File > Filter
    recordFilterValue = 'none'; // should be renamed as file filter
    showCreatedDateFilterForFile = false;
    showCreatedDateFromToFilterForFile = false;
    showLastModifiedDateFilterForFile = false;
    showLastModifiedDateFromToFilterForFile = false;
    showOwnerNameFilterForFile = false;
    showFileTypeFilterForFile = false;
    showFileSizeFilterForFile = false;

    get fileFilterOptions() {
        return [
            { label: '--None--', value: 'none' },
            { label: 'Created Date', value: 'createdDate' },
            { label: 'Created Date (From and To)', value: 'createdDateFromAndTo' },
            { label: 'Last Modified Date', value: 'lastModifiedDate' },
            { label: 'Last Modified Date (From and To)', value: 'lastModifiedDateFromAndTo' },
            { label: 'Owner Name', value: 'ownerName' },
            { label: 'File Type', value: 'fileType' },
            { label: 'File Size', value: 'fileSize' }
        ]
    }

    HandleOnFileFilterChange(event) {
        this.resetFilter();

        this.pillObjArray.forEach(poa => {
            if (poa.key == 'fileAdvSearch') {
                poa.value = '';
            }
            if (poa.key == 'CreatedDate') {
                poa.value = '';
            }
            if (poa.key == 'LastModifiedDate') {
                poa.value = '';
            }
            if (poa.key == 'CreatedDateFormTo') {
                poa.value = '';
            }
            if (poa.key == 'LastModifiedDateFormTo') {
                poa.value = '';
            }
            if (poa.key == 'fileType') {
                poa.value = '';
            }
            if (poa.key == 'ownerName') {
                poa.value = '';
            }
            if (poa.key == 'fileSize') {
                poa.value = '';
            }
        })
        this.checkForPillAvailability();
        this.fileAdvSearchValue = '';
        this.tempFileAdvSearchValue = '';
        this.recordFilterValue = event.detail.value;

        if (event.detail.value == 'createdDate') {
            this.showCreatedDateFilterForFile = true;
        }
        else if (event.detail.value == 'createdDateFromAndTo') {
            this.showCreatedDateFromToFilterForFile = true;
        }
        else if (event.detail.value == 'lastModifiedDate') {
            this.showLastModifiedDateFilterForFile = true;
        }
        else if (event.detail.value == 'lastModifiedDateFromAndTo') {
            this.showLastModifiedDateFromToFilterForFile = true;
        }
        else if (event.detail.value == 'ownerName') {
            this.showOwnerNameFilterForFile = true;
        }
        else if (event.detail.value == 'fileType') {
            this.showFileTypeFilterForFile = true;
        }
        else if (event.detail.value == 'fileSize') {
            this.showFileSizeFilterForFile = true;
        }
        this.checkPillValues('CreatedDate', '', '');
        this.checkPillValues('LastModifiedDate', '', '');
        this.checkPillValues('CreatedDateFormTo', '' + '');
        this.checkPillValues('LastModifiedDateFormTo', '', '');
    }

    //Gets the file info based on the Select operator Input fields under Filter based on files > Filter
    filterFileBy = null;
    filterFileByCreatedDate = null;
    filterFileByCreatedDateOperator = null;
    filterFileByLastModifiedDate = null;
    filterFileByLastModifiedDateOperator = null;
    filterFileByCreatedDateFrom = null;
    filterFileByCreatedDateTo = null;
    filterFileByLastModifiedDateFrom = null;
    filterFileByLastModifiedDateTo = null;
    filterByOwnerId;
    fileAdvSearchValue = '';

    get operatorOptions() {
        return [
            { label: '--None--', value: 'none' },
            { label: 'Equal to', value: 'equalTo' },
            { label: 'Lesser than', value: 'lesserThan' },
            { label: 'Lesser than or Equal to', value: 'lesserThanOrEqualTo' },
            { label: 'Greater than', value: 'greaterThan' },
            { label: 'Greater than or Equal to', value: 'greaterThanOrEqualTo' },
        ]
    }

    filterCreatedDateOperator;

    HandleOnCreatedDateOperatorChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.CreatedDate)){!cdOperator}{!cdate}';
        this.filterCreatedDateOperator = event.detail.value;

        if (event.detail.value == 'none') {
            this.filterFileByCreatedDateOperator = null;
        }
        else if (event.detail.value == 'equalTo') {
            this.filterFileByCreatedDateOperator = '=';
        }
        else if (event.detail.value == 'lesserThan') {
            this.filterFileByCreatedDateOperator = '<';
        }
        else if (event.detail.value == 'lesserThanOrEqualTo') {
            this.filterFileByCreatedDateOperator = '<=';
        }
        else if (event.detail.value == 'greaterThan') {
            this.filterFileByCreatedDateOperator = '>';
        }
        else if (event.detail.value == 'greaterThanOrEqualTo') {
            this.filterFileByCreatedDateOperator = '>=';
        }

        if (this.filterFileByCreatedDate != '' && this.filterFileByCreatedDateOperator != '' && this.filterFileByCreatedDate != null && this.filterFileByCreatedDateOperator != null) {
            this.filterFileBy = this.filterFileBy.replace('{!cdOperator}', this.filterFileByCreatedDateOperator).replace('{!cdate}', this.filterFileByCreatedDate);
            this.checkPillValues('CreatedDate', 'Created Date ' + this.filterFileByCreatedDateOperator + ' ', this.filterFileByCreatedDate);
        }
        else {
            this.checkPillValues('CreatedDate', '', '');
        }
    }

    filterCreatedDate;

    //Gets the file info based on the Enter a date Input fields under Filter based on files > Filter
    HandleOnFileFilterCreatedDateChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.CreatedDate)){!cdOperator}{!cdate}';
        this.filterFileByCreatedDate = event.detail.value;
        this.filterCreatedDate = this.filterFileByCreatedDate;

        if (this.filterFileByCreatedDate != '' && this.filterFileByCreatedDateOperator != '' && this.filterFileByCreatedDate != null && this.filterFileByCreatedDateOperator != null) {
            this.filterFileBy = this.filterFileBy.replace('{!cdOperator}', this.filterFileByCreatedDateOperator).replace('{!cdate}', this.filterFileByCreatedDate);
            this.checkPillValues('CreatedDate', 'Created Date ' + this.filterFileByCreatedDateOperator + ' ', this.filterFileByCreatedDate);
        }
        else {
            this.checkPillValues('CreatedDate', '', '');
        }
    }

    filterCreatedDateFrom
    showCreatedDateFromToError = false;

    //Gets the file info based on the From date Input fields under Filter based on files > Filter
    HandleOnFileFilterCreatedDateFromChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.CreatedDate))>={!fromDate} AND DAY_ONLY(convertTimezone(ContentDocument.CreatedDate))<={!toDate}';
        this.filterFileByCreatedDateFrom = event.detail.value;
        this.filterCreatedDateFrom = event.detail.value;

        if (this.filterFileByCreatedDateFrom != null && this.filterFileByCreatedDateTo != null && this.filterFileByCreatedDateFrom != '' && this.filterFileByCreatedDateTo != '') {
            if (this.filterFileByCreatedDateFrom <= this.filterFileByCreatedDateTo) {
                this.filterFileBy = this.filterFileBy.replace('{!fromDate}', this.filterFileByCreatedDateFrom).replace('{!toDate}', this.filterFileByCreatedDateTo);
                this.checkPillValues('CreatedDateFormTo', 'Created Date From ' + this.filterFileByCreatedDateFrom, ' To ' + this.filterFileByCreatedDateTo + ' ');
                this.showCreatedDateFromToError = false;
            } else {
                this.showCreatedDateFromToError = true;
            }
        }
        else {
            this.checkPillValues('CreatedDateFormTo', '' + '');
        }
    }

    filterCreatedDateTo

    //Gets the file info based on the To date Input fields under Filter based on files > Filter
    HandleOnFileFilterCreatedDateToChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.CreatedDate))>={!fromDate} AND DAY_ONLY(convertTimezone(ContentDocument.CreatedDate))<={!toDate}';
        this.filterFileByCreatedDateTo = event.detail.value;
        this.filterCreatedDateTo = event.detail.value;
        if (this.filterFileByCreatedDateFrom != null && this.filterFileByCreatedDateTo != null && this.filterFileByCreatedDateFrom != '' && this.filterFileByCreatedDateTo != '') {
            if (this.filterFileByCreatedDateFrom <= this.filterFileByCreatedDateTo) {
                this.filterFileBy = this.filterFileBy.replace('{!fromDate}', this.filterFileByCreatedDateFrom).replace('{!toDate}', this.filterFileByCreatedDateTo);
                this.checkPillValues('CreatedDateFormTo', 'Created Date From ' + this.filterFileByCreatedDateFrom, ' To ' + this.filterFileByCreatedDateTo + ' ');
                this.showCreatedDateFromToError = false;
            } else {
                this.showCreatedDateFromToError = true;
            }
        }
        else {
            this.checkPillValues('CreatedDateFormTo', '' + '');
        }
    }

    filterLastModifiedDateOperator

    //Gets the file info based on the Select operator Input fields under Filter based on files > Filter
    HandleOnLastModifiedDateOperatorChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.LastModifiedDate)){!lmDateOperator}{!lmdate}';
        this.filterLastModifiedDateOperator = event.detail.value;

        if (event.detail.value == 'none') {
            this.filterFileByLastModifiedDateOperator = null;
        }
        else if (event.detail.value == 'equalTo') {
            this.filterFileByLastModifiedDateOperator = '=';
        }
        else if (event.detail.value == 'lesserThan') {
            this.filterFileByLastModifiedDateOperator = '<';
        }
        else if (event.detail.value == 'lesserThanOrEqualTo') {
            this.filterFileByLastModifiedDateOperator = '<=';
        }
        else if (event.detail.value == 'greaterThan') {
            this.filterFileByLastModifiedDateOperator = '>';
        }
        else if (event.detail.value == 'greaterThanOrEqualTo') {
            this.filterFileByLastModifiedDateOperator = '>=';
        }

        if (this.filterFileByLastModifiedDate != '' && this.filterFileByLastModifiedDateOperator != '' && this.filterFileByLastModifiedDate != null && this.filterFileByLastModifiedDateOperator != null) {
            this.filterFileBy = this.filterFileBy.replace('{!lmDateOperator}', this.filterFileByLastModifiedDateOperator).replace('{!lmdate}', this.filterFileByLastModifiedDate);
            this.checkPillValues('LastModifiedDate', 'Last Modified Date ' + this.filterFileByLastModifiedDateOperator + ' ', this.filterFileByLastModifiedDate);
        }
        else {
            this.checkPillValues('LastModifiedDate', '', '');
        }

    }

    filterLastModifiedDate

    //Gets the file info based on the Enter a date Input fields under Filter based on files > Filter
    HandleOnLastModifiedDateChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.LastModifiedDate)){!lmDateOperator}{!lmdate}';
        this.filterFileByLastModifiedDate = event.detail.value;
        this.filterLastModifiedDate = event.detail.value;
        if (this.filterFileByLastModifiedDate != '' && this.filterFileByLastModifiedDateOperator != '' && this.filterFileByLastModifiedDate != null && this.filterFileByLastModifiedDateOperator != null) {
            this.filterFileBy = this.filterFileBy.replace('{!lmDateOperator}', this.filterFileByLastModifiedDateOperator).replace('{!lmdate}', this.filterFileByLastModifiedDate);
            this.checkPillValues('LastModifiedDate', 'Last Modified Date ' + this.filterFileByLastModifiedDateOperator + ' ', this.filterFileByLastModifiedDate);
        }
        else {
            this.checkPillValues('LastModifiedDate', '', '');
        }
    }

    showLastModifiedDateFromToError = false;
    filterLastModifiedDateFrom

    //Gets the file info based on the From date Input fields under Filter based on files > Filter
    HandleOnFileFilterLastModifiedDateFromChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.LastModifiedDate))>={!fromDate} AND DAY_ONLY(convertTimezone(ContentDocument.LastModifiedDate))<={!toDate}';
        this.filterFileByLastModifiedDateFrom = event.detail.value;
        this.filterLastModifiedDateFrom = event.detail.value;

        if (this.filterFileByLastModifiedDateFrom != null && this.filterFileByLastModifiedDateTo != null && this.filterFileByLastModifiedDateFrom != '' && this.filterFileByLastModifiedDateTo != '') {
            if (this.filterFileByLastModifiedDateFrom <= this.filterFileByLastModifiedDateTo) {
                this.filterFileBy = this.filterFileBy.replace('{!fromDate}', this.filterFileByLastModifiedDateFrom).replace('{!toDate}', this.filterFileByLastModifiedDateTo);
                this.checkPillValues('LastModifiedDateFormTo', 'Last Modified Date From ' + this.filterFileByLastModifiedDateFrom, ' To ' + this.filterFileByLastModifiedDateTo + ' ');
                this.showLastModifiedDateFromToError = false;
            } else {
                this.showLastModifiedDateFromToError = true;
            }
        }
        else {
            this.checkPillValues('LastModifiedDateFormTo', '', '');
        }

    }

    filterLastModifiedDateTo

    //Gets the file info based on the To date Input fields under Filter based on files > Filter
    HandleOnFileFilterLastModifiedDateToChange(event) {
        this.filterFileBy = 'AND DAY_ONLY(convertTimezone(ContentDocument.LastModifiedDate))>={!fromDate} AND DAY_ONLY(convertTimezone(ContentDocument.LastModifiedDate))<={!toDate}';
        this.filterFileByLastModifiedDateTo = event.detail.value;
        this.filterLastModifiedDateTo = event.detail.value;

        if (this.filterFileByLastModifiedDateFrom != null && this.filterFileByLastModifiedDateTo != null && this.filterFileByLastModifiedDateFrom != '' && this.filterFileByLastModifiedDateTo != '') {
            if (this.filterFileByLastModifiedDateFrom <= this.filterFileByLastModifiedDateTo) {
                this.filterFileBy = this.filterFileBy.replace('{!fromDate}', this.filterFileByLastModifiedDateFrom).replace('{!toDate}', this.filterFileByLastModifiedDateTo);
                this.checkPillValues('LastModifiedDateFormTo', 'Last Modified Date From ' + this.filterFileByLastModifiedDateFrom, ' To ' + this.filterFileByLastModifiedDateTo + ' ');
                this.showLastModifiedDateFromToError = false;
            } else {
                this.showLastModifiedDateFromToError = true;
            }
        }
        else {
            this.checkPillValues('LastModifiedDateFormTo', '', '');
        }
    }

    userListInfo;
    filteredUserListInfo;
    showUserList = false;
    ownerNameValue;

    @wire(getUsers)
    wiredGetUsers(data, error) {
        if (data) {
            this.userListInfo = data.data;
            this.filteredUserListInfo = data.data;
        }
        else if (error) {
        }
    }

    HandleOnOwnerNameChange(event) {
        if (event.detail.value != null && event.detail.value != '') {
            this.ownerNameValue = event.detail.value;
            this.showUserList = true;
            this.filteredUserListInfo = [];
            this.userListInfo.forEach(uli => {
                if (uli.Name.toLocaleLowerCase().includes(event.detail.value.toLocaleLowerCase())) {
                    this.filteredUserListInfo = [...this.filteredUserListInfo, uli];
                }
            })
        }
        else {
            this.ownerNameValue = null;
            this.showUserList = false;
            this.filteredUserListInfo = this.userListInfo;
            this.filterFileBy = null;
            this.checkPillValues('ownerName', '', '');
        }
    }

    handleOnUserClick(event) {
        this.userListInfo.forEach(uli => {
            if (uli.Id == event.currentTarget.dataset.id) {
                this.ownerNameValue = uli.Name;
                this.filterByOwnerId = uli.id;
                this.filterFileBy = 'AND ContentDocument.CreatedById={!' + uli.Id + '}';
                this.showUserList = false;
                return;
            }
        })
        this.checkPillValues('ownerName', 'Owner Name = ', this.ownerNameValue);
    }

    @track fileTypeList;
    @track fileTypeListOptions;
    loadFileType = false;
    filterFileType;

    HandleOnFileTypeChange(event) {
        this.filterFileType = event.detail.value;
        if (event.detail.value != '--None--') {
            this.filterFileBy = 'AND ContentDocument.FileType={!' + event.detail.value + '}';
            this.checkPillValues('fileType', 'File Type = ', event.detail.value);
        }
        else {
            this.filterFileBy = '';
            this.checkPillValues('fileType', '', '');
        }
    }

    filterFileBySizeOperator;
    filterFileBySize;
    filterFileBySizeUnit;

    get fileSizeOptions() {
        return [
            { label: 'Bytes', value: 'Bytes' },
            { label: 'KB', value: 'KB' },
            { label: 'MB', value: 'MB' }
        ]
    }

    filterSizeOperator;

    HandleOnFileSizeOperatorChange(event) {
        this.filterFileBy = 'AND ContentDocument.contentSize{!fileSizeOperator}{!fileSize}';
        this.filterSizeOperator = event.detail.value

        if (event.detail.value == 'none') {
            this.filterFileBySizeOperator = null;
        }
        else if (event.detail.value == 'equalTo') {
            this.filterFileBySizeOperator = '=';
        }
        else if (event.detail.value == 'lesserThan') {
            this.filterFileBySizeOperator = '<';
        }
        else if (event.detail.value == 'lesserThanOrEqualTo') {
            this.filterFileBySizeOperator = '<=';
        }
        else if (event.detail.value == 'greaterThan') {
            this.filterFileBySizeOperator = '>';
        }
        else if (event.detail.value == 'greaterThanOrEqualTo') {
            this.filterFileBySizeOperator = '>=';
        }

        if (this.filterFileBySizeOperator != null && this.filterFileBySize != null && this.filterFileBySizeUnit != null &&
            this.filterFileBySizeOperator != '' && this.filterFileBySize != '' && this.filterFileBySizeUnit != '') {
            this.filterFileBy = this.filterFileBy.replace('{!fileSizeOperator}', this.filterFileBySizeOperator).replace('{!fileSize}', this.convertToBytes(this.filterFileBySize));
            this.checkPillValues('fileSize', 'File Size ', this.filterFileBySizeOperator + ' ' + this.filterFileBySize + ' ' + this.filterFileBySizeUnit);
        }
        else {
            this.checkPillValues('fileSize', '', '');
        }
    }

    filterSize;
    HandleOnFileSizeChange(event) {
        this.filterFileBy = 'AND ContentDocument.contentSize{!fileSizeOperator}{!fileSize}';
        this.filterFileBySize = event.detail.value;
        this.filterSize = event.detail.value;

        if (this.filterFileBySizeOperator != null && this.filterFileBySize != null && this.filterFileBySizeUnit != null &&
            this.filterFileBySizeOperator != '' && this.filterFileBySize != '' && this.filterFileBySizeUnit != '') {
            this.filterFileBy = this.filterFileBy.replace('{!fileSizeOperator}', this.filterFileBySizeOperator).replace('{!fileSize}', this.convertToBytes(this.filterFileBySize));
            this.checkPillValues('fileSize', 'File Size ', this.filterFileBySizeOperator + ' ' + this.filterFileBySize + ' ' + this.filterFileBySizeUnit);
        }
        else {
            this.checkPillValues('fileSize', '', '');
        }
    }

    filterSizeUnit
    HandleOnFileSizeUnitChange(event) {
        this.filterFileBy = 'AND ContentDocument.contentSize{!fileSizeOperator}{!fileSize}';
        this.filterFileBySizeUnit = event.detail.value;
        this.filterSizeUnit = event.detail.value;

        if (this.filterFileBySizeOperator != null && this.filterFileBySize != null && this.filterFileBySizeUnit != null &&
            this.filterFileBySizeOperator != '' && this.filterFileBySize != '' && this.filterFileBySizeUnit != '') {
            this.filterFileBy = this.filterFileBy.replace('{!fileSizeOperator}', this.filterFileBySizeOperator).replace('{!fileSize}', this.convertToBytes(this.filterFileBySize));
            this.checkPillValues('fileSize', 'File Size ', this.filterFileBySizeOperator + ' ' + this.filterFileBySize + ' ' + this.filterFileBySizeUnit);
        }
        else {
            this.checkPillValues('fileSize', '', '');
        }
    }

    convertToBytes(size) {
        let fileSize = size;
        if (this.filterFileBySizeUnit == 'KB') {
            fileSize = size * 1024;
        }
        else if (this.filterFileBySizeUnit == 'MB') {
            fileSize = size * 1024 * 1024;
        }
        return Math.round(fileSize);
    }

    tempFileAdvSearchValue = '';

    HandleOnfileAdvSearchChange(event) {
        this.checkForPillAvailability();
        this.filterFileByName = '';
        this.resetFilter();
        this.recordFilterValue = 'none'

        this.tempFileAdvSearchValue = event.detail.value;
    }

    showFileAdvSearchError = false;
    fileError = '';
    handleClickAddFileAdvanceSearch() {
        let query = 'SELECT Id FROM ContentDocumentLink WHERE LinkedEntityId={!entId} AND (' + this.tempFileAdvSearchValue + ')';
        checkFileAdvSearchQuery({ query, selectedObjectName: this.selectedObjApiName })
            .then(result => {
                this.showFileAdvSearchError = false;
                if (result == 'Valid') {
                    this.fileAdvSearchValue = this.tempFileAdvSearchValue;
                    this.pillObjArray.forEach(poa => {
                        if (poa.key == 'FileName' || poa.key == 'CreatedDate' || poa.key == 'LastModifiedDate' || poa.key == 'CreatedDateFormTo' || poa.key == 'LastModifiedDateFormTo' || poa.key == 'fileType' ||
                            poa.key == 'ownerName' || poa.key == 'fileSize') {
                            poa.value = '';
                        }
                    })
                    this.checkPillValues('fileAdvSearch', 'File Advanced Search  = ', this.fileAdvSearchValue);
                } else {
                    this.showFileAdvSearchError = true;
                    this.fileError = result;
                }
            })
            .catch(error => {
            });
    }

    resetFilter() {
        this.showCreatedDateFilterForFile = false;
        this.showCreatedDateFromToFilterForFile = false;
        this.showLastModifiedDateFilterForFile = false;
        this.showLastModifiedDateFromToFilterForFile = false;
        this.showOwnerNameFilterForFile = false;
        this.showFileTypeFilterForFile = false;
        this.showFileSizeFilterForFile = false;

        this.filterFileBy = null;

        this.filterFileByCreatedDateOperator = null;
        this.filterFileByCreatedDate = null;
        this.filterCreatedDateOperator = '';
        this.filterCreatedDate = '';

        this.filterFileByLastModifiedDateOperator = null;
        this.filterFileByLastModifiedDate = null;
        this.filterLastModifiedDateOperator = ''
        this.filterLastModifiedDate = '';

        this.filterFileByCreatedDateFrom = null;
        this.filterFileByCreatedDateTo = null;
        this.filterCreatedDateTo = '';
        this.filterCreatedDateFrom = '';

        this.filterFileByLastModifiedDateFrom = null;
        this.filterFileByLastModifiedDateTo = null;
        this.filterLastModifiedDateFrom = '';
        this.filterLastModifiedDateTo = '';

        this.filterByOwnerId = null;
        this.ownerNameValue = null;

        this.filterFileByFileType = null;
        this.filterFileType = '';

        this.filterFileBySizeOperator = null;
        this.filterFileBySize = null;
        this.filterFileBySizeUnit = null;
        this.filterSizeOperator = '';
        this.filterSize = '';
        this.filterSizeUnit = '';
    }

    @track FileInfos;
    showNoItemsMsg = true;

    //Function that gets all the file info with the various filters by calling the getFiles method from massFileDownloader_Controller class
    getFiles(selectedObjApiName, filterRecordByIds, filterFileByName, filterFileBy, recordAdvancedSearchQuery, fileAdvSearchValue, listViewId) {
        getFiles({
            selectedObjApiName: selectedObjApiName, filterRecordByIds: filterRecordByIds, filterFileByName: filterFileByName, filterFileBy: filterFileBy,
            recordAdvancedSearchQuery: recordAdvancedSearchQuery, fileAdvSearchValue: fileAdvSearchValue, listViewId: listViewId
        })
            .then(result => {

                this.showDataLoadSpinner = false;

                this.FileInfos = JSON.parse(result);

                //This block is executed when a only the new object is selected in the select object dropdowns
                if (this.loadFileType == true) {
                    this.fileTypeList = ['--None--'];
                    this.fileTypeListOptions = [];
                }

                if (this.FileInfos.length > 0) {
                    if (this.callFromSearch) {
                        this.showFilter = false;
                        this.showDropDown = true;
                        this.callFromSearch = false;
                        this.handleCheckboxSelectAll(false);
                    }

                    this.showNoItemsMsg = false;
                    this.showPagination = true;

                    this.FileInfos.forEach(FileInfo => {
                        let recordUrl = this.baseUrl + '/lightning/r/' + this.selectedObjApiName + '/' + FileInfo.recordId + '/view';
                        let fileUrl = this.baseUrl + '/lightning/r/ContentDocument/' + FileInfo.contentDocuId + '/view';
                        let tempDownloadUrl = this.baseUrl + '/sfc/servlet.shepherd/version/download/' + FileInfo.cvId;
                        FileInfo.downloadUrl = tempDownloadUrl;
                        FileInfo.showGif = false;
                        FileInfo.fileUrl = fileUrl;
                        FileInfo.recordUrl = recordUrl;

                        //This block is executed when a only the new object is selected in the select object dropdowns
                        //Collects the diffrent file types from the files result
                        if (this.loadFileType == true && this.fileTypeList.includes(FileInfo.fileType) == false) {
                            this.fileTypeList.push(FileInfo.fileType);
                        }
                    });
                }
                else {
                    this.showNoItemsMsg = true;
                    this.showPagination = false;
                }

                //This block is executed when a only the new object is selected in the select object dropdowns
                //Supplies the picklist values to the file type dropdown
                if (this.loadFileType == true) {
                    this.fileTypeList.forEach(ft => {
                        let fyObj = { label: ft, value: ft }
                        this.fileTypeListOptions.push(fyObj);
                    })
                }
                this.loadFileType = false;

                this.pageNo = 1;
                this.firstButton = 1;
                this.secondButton = 2;
                this.thirdButton = 3;
                this.preparePagination();
            })
            .catch(error => {
                this.showDataLoadSpinner = false;
                this.showNoItemsMsg = true;
                this.showPagination = false;
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
            })
    }

    showPill = false;
    @track pillObjArray = [{ key: 'RecordName', value: '' }, { key: 'FileName', value: '' }, { key: 'CreatedDate', value: '' }, { key: 'LastModifiedDate', value: '' }, { key: 'CreatedDateFormTo', value: '' },
    { key: 'LastModifiedDateFormTo', value: '' }, { key: 'fileType', value: '' }, { key: 'ownerName', value: '' }, { key: 'fileSize', value: '' }, { key: 'recAdvSearch', value: '' }, { key: 'fileAdvSearch', value: '' },
    { key: 'ListViewName', value: '' }];

    checkPillValues(checkKey, pillSuffix, checkProperty) {
        this.pillObjArray.forEach(pab => {
            if (pab.key == checkKey) {
                if (checkProperty != null && checkProperty != '') {
                    pab.value = pillSuffix + checkProperty;
                }
                else {
                    pab.value = '';
                }
            }
        })

        this.checkForPillAvailability();
    }

    checkForPillAvailability() {
        this.showPill = false;
        this.pillObjArray.forEach(pba => {
            if (pba.value != null && pba.value != '') {
                this.showPill = true;
                return;
            }
        })
    }

    handleOnPillRemove(event) {
        this.pillObjArray.forEach(poa => {
            if (poa.key == event.detail.name) {
                poa.value = '';
                if (poa.key == 'RecordName') {
                    this.filterRecordByIds = [];
                    this.filterRecordByMultipleNameInput = '';
                    this.matchingRecords = [];
                    this.selectedRecordOnNameSearch = [];
                }
                else if (poa.key == 'FileName') {
                    this.filterFileByName = '';
                }
                else if (poa.key == 'CreatedDate' || poa.key == 'LastModifiedDate' || poa.key == 'CreatedDateFormTo' || poa.key == 'LastModifiedDateFormTo'
                    || poa.key == 'fileType' || poa.key == 'ownerName' || poa.key == 'fileSize') {
                    this.resetFilter();
                    this.recordFilterValue = 'none'
                }
                else if (poa.key == 'recAdvSearch') {
                    this.recordAdvancedSearchQuery = ''
                    this.tempRecordAdvancedSearchQuery = '';
                }
                else if (poa.key == 'fileAdvSearch') {
                    this.fileAdvSearchValue = ''
                    this.tempFileAdvSearchValue = '';
                }
                else if (poa.key == 'ListViewName') {
                    this.listViewId = '';
                    this.selectedListView = '';
                }
                return;
            }
        });
        this.checkForPillAvailability();
        this.callFromPillRemoveOrClear = true;
        this.handleOnSearch();
        this.callFromSearch = false;
    }

    HandleOnFilterClear() {
        this.getsize();
        this.completeReset();
        this.callFromPillRemoveOrClear = true;
        this.handleOnSearch();
        this.callFromSearch = false;
        this.handleCheckboxSelectAll(false);
        this.showRecordAdvSearchError = false;
        this.showFileAdvSearchError = false;
    }

    completeReset() {
        this.pillObjArray.forEach(poa => {
            poa.value = '';
        })
        this.checkForPillAvailability();
        this.filterRecordByIds = [];
        this.filterFileByName = '';
        this.resetFilter();
        this.recordFilterValue = 'none';

        this.tempRecordAdvancedSearchQuery = '';
        this.recordAdvancedSearchQuery = '';
        this.fileAdvSearchValue = '';
        this.tempFileAdvSearchValue = '';
        this.listViewId = '';
        this.selectedListView = '';
        this.filterRecordByMultipleNameInput = '';
        this.matchingRecords = [];
        this.selectedRecordOnNameSearch = [];
        this.showRecNameList = false
    }

    callFromSearch = false;
    callFromPillRemoveOrClear = false;
    handleOnSearch() {
        if (this.callFromPillRemoveOrClear) {
            this.callGetFilesFromSearch();
            this.callFromPillRemoveOrClear = false;
        } else {
            const allEmpty = this.pillObjArray.every(item => item.value === '');
            if (allEmpty) {
                this.showToast('Warning', 'Please enter at least one search criteria', 'warning', 'dismissible');
            } else {
                this.callGetFilesFromSearch();
            }
        }
    }

    callGetFilesFromSearch() {
        this.showDataLoadSpinner = true;
        this.callFromSearch = true;
        this.getFiles(this.selectedObjApiName, this.filterRecordByIds, this.filterFileByName, this.filterFileBy, this.recordAdvancedSearchQuery, this.fileAdvSearchValue, this.listViewId);
    }

    HandleOnDownloadClick() {
        window.open(this.downloadUrl);
    }

    @track recordsToDisplay = [];
    recordsPerPage = 10;
    pageNo = 1;
    totalRecords;
    totalPages = 1;
    recordsPerPageOnDisplay = '10';
    showPagination = false;
    start = 0;
    end = 10;
    startOnDisplay;

    showFirstButton;
    showSecondButton;
    showThirdButton;
    showThreeDots;
    showLastButton;

    firstButton = 1;
    secondButton = 2;
    thirdButton = 3;
    lastButton;

    get recordsPerPageDropDown() {
        return [
            { label: '10', value: '10' },
            { label: '20', value: '20' },
            { label: '30', value: '30' },
            { label: '40', value: '40' },
            { label: '50', value: '50' },
            { label: '75', value: '75' },
            { label: '100', value: '100' },
            { label: '200', value: '200' },
            { label: '300', value: '300' },
            { label: '400', value: '400' },
            { label: '500', value: '500' },
        ]
    }

    recordsPerPageChange(event) {
        this.showPaginationSpinner = true;
        if (event.detail.value) {
            this.recordsPerPageOnDisplay = event.detail.value;
            this.recordsPerPage = parseInt(event.detail.value);

            this.pageNo = 1;
            this.firstButton = 1;
            this.secondButton = 2;
            this.thirdButton = 3;

            this.preparePagination();
            this.handleCheckboxSelectAll(false);
        }
    }

    handleOnPaginationCLick(event) {

        this.showPaginationSpinner = true;
        this.handleCheckboxSelectAll(false);

        let slideOutDirection;
        let slideInDirection;

        if (event.target.title === 'Next Page' || event.target.title === 'Last Page' || this.pageNo < parseInt(event.target.name)) {
            slideOutDirection = 'animate-slide-out-left';
            slideInDirection = 'animate-slide-in-right';
        } else {
            slideOutDirection = 'animate-slide-out-right';
            slideInDirection = 'animate-slide-in-left';
        }

        if (this.pageNo !== parseInt(event.target.name)) {
            this.slideOut(slideOutDirection);

            setTimeout(() => {
                this.slideIn(slideInDirection);
            }, 100);
        }

        if (event.target.title == 'Next Page') {
            if (this.pageNo < this.totalPages) {
                this.pageNo += 1;
            }
        }
        else if (event.target.title == 'Previous Page') {
            if (this.pageNo > 1) {
                this.pageNo -= 1;
            }
        }
        else if (event.target.title == 'First page') {
            this.pageNo = 1;
            this.firstButton = 1;
            this.secondButton = 2;
            this.thirdButton = 3;
        }
        else if (event.target.title == 'Last Page') {
            this.pageNo = this.totalPages;
            if (this.totalPages > 3) {
                this.firstButton = this.totalPages - 3;
                this.secondButton = this.totalPages - 2;
                this.thirdButton = this.totalPages - 1;
            }
        }
        else {
            this.pageNo = parseInt(event.target.name);
        }

        this.preparePagination();
    }

    preparePagination() {
        this.totalRecords = parseInt(this.FileInfos.length);
        this.recordsPerPage = parseInt(this.recordsPerPageOnDisplay);
        if (this.recordsPerPage > this.totalRecords) {
            this.recordsPerPage = this.totalRecords;
        }

        this.totalPages = Math.ceil(this.totalRecords / this.recordsPerPage);
        this.lastButton = parseInt(this.totalPages);

        this.start = (this.pageNo - 1) * this.recordsPerPage;
        this.end = this.start + this.recordsPerPage;

        if (this.end > this.totalRecords) {
            this.end = this.totalRecords;
        }

        this.recordsToDisplay = this.FileInfos.slice(this.start, this.end);
        this.sortedByDateData = [...this.FileInfos.slice(this.start, this.end)];

        this.startOnDisplay = this.start + 1;


        if (this.pageNo > this.thirdButton) {
            this.firstButton++;
            this.secondButton++;
            this.thirdButton++;
        } else if (this.pageNo < this.firstButton) {
            this.firstButton--;
            this.secondButton--;
            this.thirdButton--;
        }

        if (this.totalPages - this.pageNo >= 1) {
            let val = this.totalPages - this.pageNo;
            this.showThreeDots = true;
        } else {
            this.showThreeDots = false;
        }

        this.showFirstButton = true;
        this.showSecondButton = true;
        this.showThirdButton = true;
        this.showLastButton = true;

        if (this.totalPages == 1) {
            this.showFirstButton = false;
            this.showSecondButton = false;
            this.showThirdButton = false;
            this.showThreeDots = false;
        }
        else if (this.totalPages == 2) {
            this.showSecondButton = false;
            this.showThirdButton = false;
            this.showThreeDots = false;
        }
        else if (this.totalPages == 3) {
            this.showThreeDots = false;
        }


        if (this.totalPages >= 4 && this.totalPages == this.pageNo) {
            this.firstButton = this.totalPages - 3;
            this.secondButton = this.totalPages - 2;
            this.thirdButton = this.totalPages - 1;
        }

        if (this.lastButton - this.thirdButton == 1) {
            this.showThreeDots = false;
        }

        if (this.lastButton - this.thirdButton == 0) {
            this.showLastButton = false;
            this.showThreeDots = false;
        }

        this.handleColorOfPaginationButton();

        this.showPaginationSpinner = false;
        this.sortData();
    }

    handleColorOfPaginationButton() {
        this.template.querySelectorAll('button').forEach(qsa => {
            qsa.style.backgroundColor = 'white';
            qsa.style.color = '#185DA4';
        })
        setTimeout(() => {
            this.template.querySelectorAll('button[name="' + this.pageNo + '"]').forEach(qsa => {
                qsa.style.backgroundColor = '#185DA4';
                qsa.style.color = 'white';
            })
        }, 50);
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

    @track selectedFilesArray = [];

    handleClickSelectFile(event) {

        const cvId = event.target.dataset.cvId;
        const condoclLinkId = event.target.dataset.cdlId;
        const isChecked = event.target.checked;
        if (isChecked) {
            if (!this.selectedFilesArray.some(item => item.cdlId === condoclLinkId)) {
                this.selectedFilesArray.push({ id: cvId, cdlId: condoclLinkId });
            }
        } else {
            const selectAllCheckBox = this.template.querySelector('[data-id="selectAll"]');
            if (selectAllCheckBox) {
                selectAllCheckBox.checked = false;
            }
            this.selectedFilesArray = this.selectedFilesArray.filter(item => item.cdlId !== condoclLinkId);
        }
    }

    showPaginationSpinner = false;

    handleClickSelectAll(event) {
        this.showPaginationSpinner = true;
        const isChecked = event.target.checked;
        this.handleCheckboxSelectAll(isChecked);
    }

    handleCheckboxSelectAll(isChecked) {
        const checkBoxes = this.template.querySelectorAll('[data-id="SelectFile"]');

        if (isChecked) {
            checkBoxes.forEach(file => {
                const cvId = file.dataset.cvId;
                const cdlId = file.dataset.cdlId;
                file.checked = true;

                if (!this.selectedFilesArray.some(item => item.id === cdlId)) {
                    this.selectedFilesArray.push({ id: cvId, cdlId: cdlId });
                }
            });
        } else {
            checkBoxes.forEach(file => {
                file.checked = false;
            });
            this.selectedFilesArray = [];

            const selectAllCheckBox = this.template.querySelector('[data-id="selectAll"]');
            if (selectAllCheckBox) {
                selectAllCheckBox.checked = false;
            }
        }
        this.showPaginationSpinner = false;
    }


    async OnClickMultiDownload() {
        if (this.selectedFilesArray.length > 0) {
            let hasDownloadAccess = await this.checkDownloadAccess();
            if (hasDownloadAccess) {
                let baseUrl = this.baseUrl + '/sfc/servlet.shepherd/version/download/';
                if (this.selectedFilesArray.length <= 500) {

                    let uniqueIds = new Set(this.selectedFilesArray.map(fileInfo => fileInfo.id));
                    let combinedIds = Array.from(uniqueIds).join('/');
                    let finalDownloadUrl = baseUrl + combinedIds;
                    var link = document.createElement("a");
                    link.href = finalDownloadUrl;
                    link.click();
                }

                let filteredFiles = this.FileInfos.filter(fileInfo =>
                    this.selectedFilesArray.some(selectedFile => selectedFile.cdlId === fileInfo.cdlId)
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

    downloadGifHtml = downloadGifJS;
    downloadImgHtml = downloadImgJS;

    async OnClickDownload(event) {

        const cdlId = event.target.dataset.cdlId;
        const downloadUrl = event.target.dataset.downloadUrl;
        const fileName = event.target.dataset.fileName;
        const docId = event.target.dataset.docId;
        let hasDownloadAccess = await this.checkDownloadAccess();
        if (hasDownloadAccess) {
            this.recordsToDisplay = this.recordsToDisplay.map(file => {
                if (file.cdlId === cdlId) {
                    return { ...file, showGif: true };
                }
                return file;
            });

            var link = document.createElement("a");
            link.href = downloadUrl;
            link.click();

            setTimeout(() => {
                this.recordsToDisplay = this.recordsToDisplay.map(file => {
                    if (file.cdlId === cdlId) {
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

    getsize() {
        const parentDivElement = this.template.querySelector('[data-id="parentDiv"]');
        const headerDivElement = this.template.querySelector('[data-id="headerDiv"]');
        if (parentDivElement && headerDivElement) {
            const screenHeight = window.screen.availHeight;
            const rect = parentDivElement.getBoundingClientRect();
            const headerDivRect = headerDivElement.getBoundingClientRect();
            const divHeight = rect.height;
            const headerDivHeight = headerDivRect.height;
            const newHeight = screenHeight - divHeight - headerDivHeight * 1.8;
            const divElement = this.template.querySelector('[data-id="noItem"]');
            if (divElement) {
                divElement.style.height = `${newHeight}px`;
                divElement.innerHTML = '<div class="slds-text-body_small">No items to display.</div>';
            }
        }
    }

    renderedCallback() {
        this.getsize();
        this.setSizeForStickyDiv();
    }

    showUpArrow = true;
    showFilter = true;
    showDropDown = false;

    handleShowFilter() {
        this.showFilter = true;
        this.showDropDown = false;
        this.showUpArrow = true;
    }

    handleHideFilter() {
        this.showUpArrow = false;
        this.showFilter = false;
        this.showDropDown = true;
    }

    animationClass = '';

    slideIn(direction) {
        this.animationClass = direction;
    }

    slideOut(direction) {
        this.animationClass = direction;
    }

    handleClickCalenderly() {
        window.open('https://calendly.com/contactus-redfernstech/');
    }

    showListViewError = true;
    disableListComboBox = true;

    @wire(getMetaDataValues)
    wiredGetMetaDataValues({ data, error }) {
        if (data) {
            const mdt = JSON.parse(data);
            if (mdt.rft_cc__Client_Id__c && mdt.rft_cc__Client_Key__c && mdt.rft_cc__User_Name__c
                && mdt.rft_cc__Paword__c && mdt.rft_cc__Security_Token__c) {

                this.showListViewError = false;
                this.disableListComboBox = false;
            }
            else {
                this.showListViewError = true;
                this.disableListComboBox = true;
            }
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
            this.getsizeForSticky();
        }, 20);
    }

    stickyDivTopHeight;

    getsizeForSticky() {
        const headerDivElement = this.template.querySelector('[data-id="headerDiv"]');
        if (headerDivElement) {
            const headerDivRect = headerDivElement.getBoundingClientRect();
            this.stickyDivTopHeight = headerDivRect.top - 8;
            this.stickyDivTopHeight += 'px';
        }
    }

    setSizeForStickyDiv() {
        const stickyElement = this.template.querySelector('[data-id="stickyTop"]');

        if (stickyElement) {
            stickyElement.style.top = this.stickyDivTopHeight;
        }
    }

    get sortByOptions() {
        return [
            { label: 'File Name', value: 'FileName' },
            { label: 'Record Name', value: 'RecordName' },
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
            else if (event.detail.value === 'RecordName') {
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

    sortedByDateData = [];

    sortData() {
        if (this.displaySortByValue === 'CreatedDate' && this.ascOrDesvalue === 'des') {
            this.recordsToDisplay = [...this.sortedByDateData];
            return;
        }

        this.recordsToDisplay.sort((a, b) => {
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
                case 'RecordName':
                    valueA = a.recordName.toLowerCase();
                    valueB = b.recordName.toLowerCase();
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

    createCSV(data) {
        //id, title, related record id, related record name, file created by name, file created by email id, 
        //file created date, file size, file extension, file type, ip
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

    isFilterDisabled = true;

    get filterDisableClass() {
        return this.isFilterDisabled ? 'disabled-filter' : '';
    }

    HandleLogoClick() {
        window.open('https://redfernstech.com/');
    }

    handleLinkedInClick() {
        window.open('https://www.linkedin.com/company/redferns-tech-private-limited/');
    }

    handleYouTubeClick() {
        window.open('https://www.youtube.com/@RedFernsTech');
    }

    handleInstagramClick() {
        window.open('https://www.instagram.com/redferns_tech/');
    }

    handleFacebookClick() {
        window.open('https://www.facebook.com/people/RedFerns-Tech-Private-Limited/61551828750125/');
    }

    showHelpTextFilterApplied = false;

    HandleOnMouseOverFilterApplied() {
        this.showHelpTextFilterApplied = true;
    }

    HandleOnMouseLeaveFilterApplied() {
        this.showHelpTextFilterApplied = false;
    }

    showHelpTextFilterOnRecord = false;

    HandleOnMouseOverFilterOnRecord() {
        this.showHelpTextFilterOnRecord = true;
    }

    HandleOnMouseLeaveFilterOnRecord() {
        this.showHelpTextFilterOnRecord = false;
    }

    showHelpTextFilterOnFile = false;

    HandleOnMouseOverFilterOnFile() {
        this.showHelpTextFilterOnFile = true;
    }

    HandleOnMouseLeaveFilterOnFile() {
        this.showHelpTextFilterOnFile = false;
    }

}