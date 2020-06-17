import { END_DATE, START_DATE } from './config.js';
import {
 getPRs,
 loadProjectList,
 loadStudentsList
} from './githubFuncs';

import fs from 'fs';

function msleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

loadProjectList()
.then((project_list)=>{
    loadStudentsList()
    .then((res) => {
        let count = 0;
        fs.writeFileSync('scores.csv', 'username,total_score\n');
        res.forEach((username) => {
            getPRs(username, START_DATE, END_DATE, project_list)
            .then((resp) => {
                count++;
                console.log(count + " fetched, last was " + username + " with " + resp);
                fs.appendFileSync('scores.csv', username + "," + resp + "\n");
                // msleep(10);
            })
            .catch((error) => {
                if (username && username != "") {
                    console.error(error);
                    console.error("Failed to get PRs");   
                }
            });
        });
    })
    .catch(error => {console.error(error)});
})
.catch((err) => console.error(err));