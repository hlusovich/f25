import {CommonService} from "../services/common.service.js";
import {defaultStatusName} from "../constants/statusNameConstants.js";
import {AsanaHttpService} from "../dal/asanaHttpService.js";
import {JetSpaceHttpService} from "../dal/jetSpaceHttpService.js";
import {CommonHttpService} from "../dal/commonHttp.sepvice.js";

export async function initControllers() {
    const commonService = new CommonService();
    const asanaHttpService = new AsanaHttpService();
    const fileLoader = document.getElementById('file-loader');
    const fileLoaderText = document.getElementById('file-loader-text');
    const selectJetBrainsOptionsContainer = document.getElementById('jet-brains-options');
    const selectAsanaOptionsContainer = document.getElementById('asana-project-options');
    const spinner = document.getElementById('spinner');
    const submitButton = document.getElementById('submit-button');
    const migrateResult = document.getElementById('migrate-result');
    const migrateResultClose = document.getElementById('migrate-result-close');
    const migrateResultList = document.getElementById('migrate-result-list');
    const filter = document.getElementById('asana-projects-filter');

    const checkNames = document.getElementById('check-names');
    const from = document.getElementById('from');
    const to = document.getElementById('to');



    let tasksFrom = 0;
    let tasksTo = 0;

    checkNames.addEventListener("click", () => {
        if(commonService.issuesList?.length) {
            commonService.issuesList.slice(tasksFrom, tasksTo).map(item => console.log(item.name));
        }
    })
    from.addEventListener("input", input => {
        tasksFrom = input.target.value;
    });

    to.addEventListener("input", input => {
        tasksTo = input.target.value;
    });

    filter.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    filter.addEventListener('input', (event) => {
        event.stopPropagation();
        document.querySelectorAll(".asana-custom-option").forEach(item => {
            if(!event.target.value.trim()) {
                item.classList.remove('hidden');
                return;
            }

            if(item.getAttribute('data-name').toLowerCase().startsWith(event.target.value.toLowerCase())) {
                item.classList.remove('hidden');
            }
            else {
                item.classList.add('hidden');
            }
        })
    });

    toggleLoading();
    commonService.jetSpaceProjects = await JetSpaceHttpService.getProjects();
    commonService.asanaProjects = await asanaHttpService.getAllWorkspaceProjects();

    commonService.asanaProjects = commonService.asanaProjects.sort(function(a, b){
        if(a.name.toLowerCase().trim() < b.name.toLowerCase().trim()) { return -1; }
        if(a.name.toLowerCase().trim() > b.name.toLowerCase().trim()) { return 1; }
        return 0;});

    commonService.jetSpaceProjects = commonService.jetSpaceProjects.sort(function(a, b){
        if(a.name.toLowerCase().trim() < b.name.toLowerCase().trim()) { return -1; }
        if(a.name.toLowerCase().trim() > b.name.toLowerCase().trim()) { return 1; }
        return 0;});

    toggleLoading();

    commonService.jetSpaceProjects.forEach(project => {
        const option = createSelectOption(project.name, project.id, 'jet-custom-option');
        selectJetBrainsOptionsContainer.append(option);
    });

    commonService.asanaProjects.forEach(project => {
        const option = createSelectOption(project.name, project.gid, 'asana-custom-option');
        selectAsanaOptionsContainer.append(option);
    });

    for (const option of document.querySelectorAll(".jet-custom-option")) {
        addOptionListener(option, (context) => {
            commonService.selectedJetBrainsProject = context.getAttribute('data-value');
        });
    }

    for (const option of document.querySelectorAll(".asana-custom-option")) {
        addOptionListener(option, (context) => {
            commonService.selectedAsanaProject = context.getAttribute('data-value')
            commonService.selectedJetBrainsProjectName = context.getAttribute('data-name');
        });
    }


    window.addEventListener('click', function (e) {
        const jetSelect = document.getElementById('jet-projects-select');
        const asanaSelect = document.getElementById('asana-projects-select');

        if(filter.contains(e.target)) {
            return;
        }


        if (!jetSelect.contains(e.target) && !asanaSelect.contains(e.target)) {
            jetSelect.classList.remove('open');
            asanaSelect.classList.remove('open');
        }

        if (jetSelect.contains(e.target)) {
            asanaSelect.classList.remove('open');
        }

        if (asanaSelect.contains(e.target)) {
            jetSelect.classList.remove('open');
        }
    });

    document.getElementById('jet-brains-projects').addEventListener('click', function () {
        this.querySelector('.select').classList.toggle('open');
        submitButton.disabled = !commonService.isFormValid();

        if(submitButton.disabled) {
            submitButton.classList.add('disabled');
        }
        else {
            submitButton.classList.remove('disabled');
        }
    });

    document.getElementById('asana-projects').addEventListener('click', function () {
        this.querySelector('.select').classList.toggle('open');
        submitButton.disabled = !commonService.isFormValid();

        if(submitButton.disabled) {
            submitButton.classList.add('disabled');
        }
        else {
            submitButton.classList.remove('disabled');
        }
    });


    fileLoader.addEventListener('change', async (input) => {
        if(!input.target.files.length) {
            return;
        }

        fileLoaderText.innerText = input.target.files[0].name;
        commonService.issuesList = await commonService.readFile(input.target.files[0]);
        commonService.issuesList = commonService.issuesList.filter(item => item.taskId);
        from.value = 0;
        to.value = commonService.issuesList.length;
        tasksTo = commonService.issuesList.length;
        submitButton.disabled = !commonService.isFormValid();

        if(submitButton.disabled) {
            submitButton.classList.add('disabled');
        }
        else {
            submitButton.classList.remove('disabled');
        }
    });

    migrateResultClose.addEventListener('click', () => {
        toggleResultModal();
    });

    addSubmitButtonEventListener();

    function toggleLoading() {
        spinner.classList.toggle('hidden');
    }

    function createResultItem(itemData, title) {
        const item = document.createElement('div');
        item.className = 'result-list-item';

        const itemTitle = document.createElement('div');
        itemTitle.className = 'result-list-item-title';
        const itemTitleText = document.createElement('div');
        itemTitleText.innerText = title;
        itemTitle.append(itemTitleText);
        const itemTitlePin = document.createElement('div');
        itemTitlePin.className = 'result-list-item-status';

        itemTitlePin.classList.add(itemData.status);

        itemTitle.append(itemTitlePin);

        item.append(itemTitle);

        const itemText = document.createElement('div');
        itemText.className = 'result-list-item-text';
        itemText.innerText = itemData.value?.statusText || itemData.value?.statusText;

        item.append(itemText);

        migrateResultList.append(item);
    }

    function toggleResultModal() {
        migrateResult.classList.toggle('hidden');
    }

    function createSelectOption(name, id, identifier) {
        const option = document.createElement('span');
        option.classList.add('custom-option');
        option.classList.add(identifier);
        option.innerText = name;
        option.setAttribute('data-value', id);
        option.setAttribute('data-name', name);

        return option;
    }

    function addOptionListener(option, callback) {
        option.addEventListener('click', function () {
            if (!this.classList.contains('selected')) {
                const selectedOption = this.parentNode.querySelector('.custom-option.selected');

                if (selectedOption) {
                    selectedOption.classList.remove('selected');
                }

                this.classList.add('selected');
                this.closest('.select').querySelector('.select__trigger span').textContent = this.textContent;
                callback(this);
            }
        })
    }

    function addSubmitButtonEventListener() {

        submitButton.addEventListener('click', async () => {
            commonService.issuesList = commonService.issuesList.slice(tasksFrom, tasksTo);

            toggleLoading();
            const customFields = await JetSpaceHttpService.getCustomFields(commonService.selectedJetBrainsProject);

            const allBoards = await JetSpaceHttpService.getAllProjectBoards(commonService.selectedJetBrainsProject);
            let board = allBoards.data.find(item => item.name === commonService.selectedJetBrainsProjectName);

            if(!board) {
                board = await  JetSpaceHttpService.createBoard(commonService.selectedJetBrainsProjectName, commonService.selectedJetBrainsProject);
            }

            const projectMembers = await JetSpaceHttpService.getProjectMembers(commonService.selectedJetBrainsProject);
            const combinedData = await asanaHttpService.getAsanaCustomFieldsStatuses(commonService.selectedAsanaProject);
            const jetTags = await JetSpaceHttpService.getAllHierarchicalTags(commonService.selectedJetBrainsProject);

            commonService.asanaStatuses = combinedData[0];
            commonService.tags = combinedData[1];

            const customStatusesPromises = [];

            for (let i = 0; i < combinedData[2].length; i++) {
                const name = combinedData[2][i].name;
                const value = combinedData[2][i]['enum_options'] ?? combinedData[2][i].name;
                const isCustomFieldExist = customFields.find(customField =>customField.name === name.trim());

                if(!isCustomFieldExist) {
                    customStatusesPromises.push(JetSpaceHttpService.createCustomField(name.trim(), value, commonService.selectedJetBrainsProject))
                }
            }

            const jetStatuses = await Promise.allSettled(customStatusesPromises);
            const mappedJetStatuses = [...customFields, ...jetStatuses.map(item => item.value)];

            const statuses = await JetSpaceHttpService.getJetStatuses(commonService.selectedJetBrainsProject)
            commonService.jetStatuses = statuses;

            if((!statuses.length || statuses.length === 3) && commonService.asanaStatuses.length) {
                await JetSpaceHttpService.createJetStatuses(commonService.asanaStatuses, commonService.selectedJetBrainsProject);
                commonService.jetStatuses = await JetSpaceHttpService.getJetStatuses(commonService.selectedJetBrainsProject);
            }

            const tagsPromises = [];

            if (commonService.tags?.length) {
                commonService.tags.forEach(tag => tagsPromises.push(JetSpaceHttpService.createJetTags(tag, commonService.selectedJetBrainsProject)));

                if (commonService.tags) {
                    await Promise.all(tagsPromises);
                }
            }


            migrateResultList.innerHTML = '';

            
            const issuesByName = {};
            const issuesParentDeepByName  = {};
            const getIssueParentDeepByName = (name) => {
                if(issuesByName[name] && name === issuesByName[name]['Parent Task']) {
                    return 1;
                }

               return  1 + (issuesByName[name]?.['Parent Task'].trim() ? getIssueParentDeepByName(issuesByName[name]['Parent Task']) : 0)
            };
            commonService.issuesList.forEach(issue => { issuesByName[issue.name] = issue; });
            commonService.issuesList.forEach(issue => {
                return issuesParentDeepByName[issue.name] = getIssueParentDeepByName(issue.name); });

            commonService.issuesList.sort((a, b) => issuesParentDeepByName[a.name] - issuesParentDeepByName[b.name]);
            commonService.createdIssuesIdsByName = {};

            let start = 0;
            let end = commonService.issuesList.length < 100 ? commonService.issuesList.length : start + 100;

            while (start < commonService.issuesList.length) {
                try {
                    await createIssuesBatch(commonService.issuesList.slice(start, end));
                } catch (e) {
                    console.error(`Can not create issues batch from ${start} to ${end}`, e);
                }

                start = end;
                end = start + 100 < commonService.issuesList.length ? start + 100 : commonService.issuesList.length;

                console.log(`Обработано ${start} из ${commonService.issuesList.length}`);
            }

            toggleLoading();
            toggleResultModal();

            async function createIssuesBatch(issues) {
                const promises = [];

                issues.forEach(issue => {
                    let status = commonService.jetStatuses.find(status => status.name === issue.status);

                    if(!status) {
                        status = commonService.jetStatuses.find(status => status.name ===  defaultStatusName)
                    }
                    issue.status = status?.id || commonService.jetStatuses[0].id;
                });

                issues.forEach((item) => {
                    promises.push(
                      JetSpaceHttpService.createIssue(
                        item,
                        mappedJetStatuses,
                        jetTags.data,
                        projectMembers,
                        commonService.selectedJetBrainsProject,
                        asanaHttpService,
                        item['Parent Task']?.trim() ?  commonService.createdIssuesIdsByName[item['Parent Task']] : null
                      ).catch((e) => {
                        console.error(`Can not create issue ${item.name}`, e);
                      })
                    );
                  });
                
                const result = await Promise.allSettled(promises);

                result.forEach((item, index) => {
                    createResultItem(item, issues[index].name);
                });
                
                for (let i = 0; i < result.length; i++) {
                    try {
                        const json = await result[i]?.value?.json();
                        commonService.createdIssuesIdsByName[json.title] = json.id;

                        const comments = await asanaHttpService.getAsanaTaskComments(issues[i].taskId);
                        const downloadImagePromises = [];
    
                        comments.forEach(comment => {
                            if (comment.text.startsWith('https://asana-user-private-us-east-1.s3.amazonaws.com/assets')) {
                                downloadImagePromises.push(CommonHttpService.downloadImageAsFile(comment.text))
                            }
                        });
    
                        const downloadImagePromisesResults = await Promise.allSettled(downloadImagePromises);
                        let uploadCounter = 0;
    
                        if(json) {
                            await JetSpaceHttpService.addTaskToBoard(board.id, json.id);
                        }
    
    
                        if (comments.length) {
                            if(!json) {
                               console.log(`${issues[i].name} не было перенесено, добавьте мануально`);
                            }
    
                            if(json){
                                for (let j = 0; j < comments.length; j++) {
    
                                    if (comments[j].text.startsWith('https://asana-user-private-us-east-1.s3.amazonaws.com/assets')) {
                                        const resultToBlob = await downloadImagePromisesResults[uploadCounter].value.blob();
                                        const file = new File([resultToBlob], "asanaMigration");
                                        const imageId = await JetSpaceHttpService.uploadAttachment(file );
                                        await JetSpaceHttpService.attachImageToJetComment(json.id, imageId);
                                        uploadCounter++;
    
                                    } else {
                                        await JetSpaceHttpService.addJetIssueComment(json.id, comments[j]);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Can not add comments to issue ${issues[i].name}`, error);
                    }
                }
            }
        });
    }

}