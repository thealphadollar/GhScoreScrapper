import HttpsProxyAgent from 'https-proxy-agent';
import fetch from '@adobe/node-fetch-retry';
import fs from 'fs';

let token = process.env.GITHUB_TOKEN;

async function getPRs(github_username, start_date, end_date, projects_list) {
    
    if (!github_username || github_username == "") {
        throw new ValidationError("empty username passed!");
    }
    let temp_data;
    let page = 1;
    let prs_data_merged = {
        items: [],
    };

    do {
        const url_merged = `https://api.github.com/search/issues?q=author:${github_username} type:pr is:merged updated:${start_date}..${end_date} sort:updated&page=${page}&per_page=100`;
        let response_merged;
        response_merged = await fetch(url_merged, {
            agent:new HttpsProxyAgent('http://172.16.2.30:8080'),
            headers: {
                'Authorization': 'token ' + token,
            }
        });
        temp_data = await response_merged.json();
        prs_data_merged.total_count = temp_data.total_count;
        if (!temp_data.items || temp_data.items.length == 0) {
            break;
        }
        prs_data_merged.items = [
            ...prs_data_merged.items,
            ...temp_data.items,
        ];
        prs_data_merged.items = prs_data_merged.items.filter(function(elem, pos) {
            return prs_data_merged.items.indexOf(elem) == pos;
        });
        page++;
    } while (page <= 3);
    
    // console.log("Merged PRs:\n", prs_data_merged);
    
    // store only PRs that are in the project list
    prs_data_merged.items = prs_data_merged.items.filter((pr, index, arr) => {
        const repo = pr.repository_url.substring(29);
        for (let i = 0; i < projects_list.list.length; i++) {
            if (repo === projects_list.list[i]) {
                return true;
            }
        }
        return false;
    });
    
    // filter merged PRs so that only the ones with the label 'gssoc20' are left
    prs_data_merged.items = prs_data_merged.items.filter((element) => {
        if (
            element.labels
            .map((label) => label.name.replace(/\s/g, "").toLowerCase())
            .includes("gssoc20")
            ) {
                return true;
            } else {
                return false;
            }
        });
        
        // SCORE CALCULATION
        let possible_scores = { beginner: 2, easy: 4, medium: 7, hard: 10 };
        
        // combine all labels from all merged PRs into an array
        let merged_labels = [];
        prs_data_merged.items.forEach((element) => {
            const labels = element.labels;
            merged_labels = merged_labels.concat(labels);
        });
        
        // keep only the scoring labels from possible_labels in the array
        const merged_labels_scoring = merged_labels.filter((label) => {
            if (
                Object.keys(possible_scores).includes(
                    label.name.replace(/\s/g, "").toLowerCase()
                    )
                    ) {
                        return true;
                    } else {
                        return false;
                    }
                });
                // console.log("MERGED LABELS SCORING\n", merged_labels_scoring);
                
                // convert scoring labels into respective numbers
                const scores_array = merged_labels_scoring.map((label) => {
                    return possible_scores[label.name.toLowerCase()];
                });
                // console.log("SCORES ARRAY\n", scores_array);
                
                // add all scores
                const total_score = scores_array.reduce((prev, curr) => {
                    return prev + curr;
                }, 0);
                // console.log("TOTAL SCORE: ", total_score);
                return total_score;
}
                                    
async function loadProjectList() {
    let rawdata = fs.readFileSync('project_list.json');
    let projects_list = await JSON.parse(rawdata);
    projects_list.list = projects_list.list.map((item) => item.repo_fullname);
    let org_arr = projects_list.list.filter((item) => !item.includes("/"));
    const fetchOrgPromises = org_arr.map(async (org) => {
        const url = `https://api.github.com/orgs/${org}/repos`;
        const response = await fetch(url, { 
            agent:new HttpsProxyAgent('http://172.16.2.30:8080'),
            headers: {
                'Authorization': 'token ' + token,
            }
        });
        let data = await response.json();
        return data;
    });
    
    org_arr = await Promise.all(fetchOrgPromises);
    org_arr = [].concat(...org_arr);
    org_arr = org_arr.map((item) => item.full_name);
    projects_list.list = projects_list.list.filter((item) => item.includes("/"));
    projects_list.list = projects_list.list.concat(org_arr);
    return projects_list;
}

async function loadStudentsList() {
    let data = fs.readFileSync('students.csv', 'utf8');
    return data.split(/\r?\n/);
}


export { getPRs, loadProjectList, loadStudentsList };