
(function(){
"use strict";

var DEFAULT_STUDENTS=["Abdi", "Jason", "Lachlan", "Azaylea", "Bryan", "Elliot", "Shreeya", "Nathan", "Sylvia", "Suhana", "Ritchy", "Muhammad", "Jackson", "Sulaiman", "Hugo", "Marc", "Gio", "Zoey", "Chloe", "Annie", "Doris", "Jeslyn", "Alan", "Olivia", "Jonathan", "Jessica"];
var DEFAULT_DESTINATIONS=["🚻 Toilet","💧 Drink","🏢 Office","🩺 Sick Bay","📚 Library","👩‍🏫 Support Teacher"];

function loadWithLegacy(primaryKey,legacyKeys,fallback){
  var primary=load(primaryKey,null);
  if(primary!==null)return primary;
  for(var i=0;i<legacyKeys.length;i++){
    var legacy=load(legacyKeys[i],null);
    if(legacy!==null)return legacy;
  }
  return fallback;
}
var settings=loadWithLegacy("reliable_settings",["clean_settings","v6_settings","v5_settings"],{students:DEFAULT_STUDENTS,destinations:DEFAULT_DESTINATIONS,pin:"1234"});
var active=loadWithLegacy("reliable_active",["clean_active","v6_active","v5_active"],[]);
var history=loadWithLegacy("reliable_history",["clean_history","v6_history","v5_history"],[]);
if(!Array.isArray(active)){
  active=Object.keys(active||{}).map(function(name){
    return {name:name,destination:active[name].destination,leftAt:active[name].leftAt};
  });
}
history=(history||[]).map(function(item){
  if(!item.name&&item.student)item.name=item.student;
  return item;
});
var selectedName="";
var selectedDestination="";
var historyRange="today";

function byId(id){return document.getElementById(id)}
function load(key,fallback){
  try{var value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch(e){return fallback}
}
function persist(){
  localStorage.setItem("reliable_settings",JSON.stringify(settings));
  localStorage.setItem("reliable_active",JSON.stringify(active));
  localStorage.setItem("reliable_history",JSON.stringify(history));
}
function clearNode(node){while(node.firstChild)node.removeChild(node.firstChild)}
function addText(node,value){node.appendChild(document.createTextNode(String(value)))}
function now(){return Date.now()}
function findActive(name){for(var i=0;i<active.length;i++)if(active[i].name===name)return i;return -1}
function minutesSince(time){return Math.max(0,Math.floor((now()-time)/60000))}
function startOfToday(){var d=new Date();d.setHours(0,0,0,0);return d.getTime()}
function startOfWeek(){var d=new Date(),day=d.getDay(),diff=day===0?6:day-1;d.setHours(0,0,0,0);d.setDate(d.getDate()-diff);return d.getTime()}
function formatDateTime(time){var d=new Date(time);return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes())}
function pad(n){return ("0"+n).slice(-2)}
function formatClock(){var d=new Date();return pad(d.getHours())+":"+pad(d.getMinutes())}
function formatDateLabel(){var d=new Date(),days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return days[d.getDay()]+" "+d.getDate()+" "+months[d.getMonth()]}
function cleanLines(value){var result=[],seen={};value.split("\n").forEach(function(v){v=v.trim();if(v&&!seen[v]){seen[v]=true;result.push(v)}});return result}
function openModal(id){var modal=byId(id);modal.classList.add("open");modal.setAttribute("aria-hidden","false")}
function closeModal(id){var modal=byId(id);modal.classList.remove("open");modal.setAttribute("aria-hidden","true")}
function rangeItems(range,search){var min=0;if(range==="today")min=startOfToday();else if(range==="week")min=startOfWeek();search=(search||"").toLowerCase();return history.filter(function(item){return item.leftAt>=min&&(!search||item.name.toLowerCase().indexOf(search)>=0||item.destination.toLowerCase().indexOf(search)>=0)})}
function totals(items){return items.reduce(function(acc,item){acc.trips+=1;acc.minutes+=Number(item.minutes)||0;return acc},{trips:0,minutes:0})}

function render(){
  var studentGrid=byId("studentGrid"),outGrid=byId("outGrid");
  clearNode(studentGrid);clearNode(outGrid);

  settings.students.forEach(function(name){
    var index=findActive(name),button=document.createElement("button");
    button.type="button";button.className=index>=0?"student-button out":"student-button";button.dataset.name=name;
    addText(button,name);
    button.addEventListener("click",function(){
      var student=this.dataset.name;
      if(findActive(student)>=0)openReturn(student);else openLeave(student);
    });
    studentGrid.appendChild(button);
  });

  if(active.length===0){
    var empty=document.createElement("div");empty.className="empty";addText(empty,"Everyone is currently in class.");outGrid.appendChild(empty);
  }else{
    active.forEach(function(item){
      var card=document.createElement("div"),elapsed=minutesSince(item.leftAt);
      card.className="out-card"+(elapsed>=10?" late":elapsed>=5?" mid":"");
      var name=document.createElement("div");name.className="out-name";addText(name,item.name);
      var detail=document.createElement("div");detail.className="out-detail";addText(detail,item.destination+" · "+elapsed+" min");
      card.appendChild(name);card.appendChild(detail);outGrid.appendChild(card);
    });
  }

  var todayTrips=rangeItems("today","").length+active.filter(function(item){return item.leftAt>=startOfToday()}).length;
  byId("inCount").textContent=String(settings.students.length-active.length);
  byId("outCount").textContent=String(active.length);
  byId("todayCount").textContent=String(todayTrips);
  byId("dateLabel").textContent=formatDateLabel();
  byId("clockLabel").textContent=formatClock();
}

function openLeave(name){
  selectedName=name;selectedDestination="";
  byId("leaveHeading").textContent=name+": Where are you going?";
  byId("otherDestination").value="";
  var grid=byId("destinationGrid");clearNode(grid);
  settings.destinations.forEach(function(destination){
    var button=document.createElement("button");button.type="button";button.className="destination-button";button.dataset.destination=destination;addText(button,destination);
    button.addEventListener("click",function(){selectedDestination=this.dataset.destination;completeLeave()});
    grid.appendChild(button);
  });
  openModal("leaveModal");
}
function completeLeave(){
  var destination=byId("otherDestination").value.trim()||selectedDestination;
  if(!destination){alert("Choose a destination.");return}
  if(findActive(selectedName)<0)active.push({name:selectedName,destination:destination,leftAt:now()});
  persist();closeModal("leaveModal");render();
}
function openReturn(name){
  var index=findActive(name);if(index<0){render();return}
  selectedName=name;
  byId("returnHeading").textContent=name+": Return to class?";
  byId("returnDetails").innerHTML="Destination: "+active[index].destination+"<br>Time out: "+minutesSince(active[index].leftAt)+" minute(s)";
  openModal("returnModal");
}
function completeReturn(){
  var index=findActive(selectedName);if(index<0){closeModal("returnModal");render();return}
  var item=active[index],end=now();
  history.push({name:item.name,destination:item.destination,leftAt:item.leftAt,returnedAt:end,minutes:Math.max(1,Math.round((end-item.leftAt)/60000))});
  active.splice(index,1);persist();closeModal("returnModal");render();
}

function addCell(row,value){var cell=document.createElement("td");addText(cell,value);row.appendChild(cell)}
function renderHistory(){
  var body=byId("historyBody"),mode=byId("historySort").value,items=rangeItems(historyRange,byId("historySearch").value);
  clearNode(body);
  if(items.length===0){var row=document.createElement("tr"),cell=document.createElement("td");cell.colSpan=5;addText(cell,"No matching history.");row.appendChild(cell);body.appendChild(row);return}
  if(mode==="time"){
    items.sort(function(a,b){return b.leftAt-a.leftAt});
    items.forEach(function(item){var row=document.createElement("tr");addCell(row,item.name);addCell(row,item.destination);addCell(row,formatDateTime(item.leftAt));addCell(row,formatDateTime(item.returnedAt));addCell(row,item.minutes);body.appendChild(row)});
  }else{
    var groups={};items.forEach(function(item){if(!groups[item.name])groups[item.name]=[];groups[item.name].push(item)});
    Object.keys(groups).sort().forEach(function(name){
      var records=groups[name],total=records.reduce(function(sum,item){return sum+(Number(item.minutes)||0)},0);
      var head=document.createElement("tr");head.className="group-row";var cell=document.createElement("td");cell.colSpan=5;addText(cell,name+" — "+records.length+" trip"+(records.length===1?"":"s")+" — "+total+" total min");head.appendChild(cell);body.appendChild(head);
      records.sort(function(a,b){return b.leftAt-a.leftAt}).forEach(function(item,index){var row=document.createElement("tr");addCell(row,"Trip "+(index+1));addCell(row,item.destination);addCell(row,formatDateTime(item.leftAt));addCell(row,formatDateTime(item.returnedAt));addCell(row,item.minutes);body.appendChild(row)});
    });
  }
}
function csvValue(value){return '"'+String(value).replace(/"/g,'""')+'"'}
function buildCsv(){
  var items=rangeItems(byId("exportRange").value,""),mode=byId("exportSort").value,lines=[];
  if(mode==="time"){
    lines.push("Student,Destination,Left,Returned,Minutes");
    items.sort(function(a,b){return a.leftAt-b.leftAt}).forEach(function(item){lines.push([csvValue(item.name),csvValue(item.destination),csvValue(formatDateTime(item.leftAt)),csvValue(formatDateTime(item.returnedAt)),item.minutes].join(","))});
  }else{
    lines.push("Student,Trips,Total Minutes,Destination,Left,Returned,Trip Minutes");
    var groups={};items.forEach(function(item){if(!groups[item.name])groups[item.name]=[];groups[item.name].push(item)});
    Object.keys(groups).sort().forEach(function(name){
      var records=groups[name],total=records.reduce(function(sum,item){return sum+(Number(item.minutes)||0)},0);
      records.sort(function(a,b){return a.leftAt-b.leftAt}).forEach(function(item,index){lines.push([csvValue(name),index===0?records.length:"",index===0?total:"",csvValue(item.destination),csvValue(formatDateTime(item.leftAt)),csvValue(formatDateTime(item.returnedAt)),item.minutes].join(","))});
    });
  }
  return lines.join("\n");
}
function updateDashboard(){var today=totals(rangeItems("today","")),week=totals(rangeItems("week",""));byId("dashTodayTrips").textContent=today.trips;byId("dashTodayMinutes").textContent=today.minutes;byId("dashWeekTrips").textContent=week.trips;byId("dashWeekMinutes").textContent=week.minutes}
function refreshExport(){byId("exportText").value=buildCsv()}
function openTeacher(){byId("pinPanel").hidden=false;byId("teacherPanel").hidden=true;byId("pinInput").value="";openModal("teacherModal")}

byId("teacherButton").addEventListener("click",openTeacher);
byId("leaveCancel").addEventListener("click",function(){closeModal("leaveModal")});
byId("leaveConfirm").addEventListener("click",completeLeave);
byId("returnCancel").addEventListener("click",function(){closeModal("returnModal")});
byId("returnConfirm").addEventListener("click",completeReturn);
byId("pinCancel").addEventListener("click",function(){closeModal("teacherModal")});
byId("pinUnlock").addEventListener("click",function(){
  if(byId("pinInput").value!==String(settings.pin)){alert("Incorrect PIN.");return}
  byId("pinPanel").hidden=true;byId("teacherPanel").hidden=false;
  byId("studentNames").value=settings.students.join("\n");byId("destinations").value=settings.destinations.join("\n");byId("newPin").value=settings.pin;
  updateDashboard();renderHistory();refreshExport();
});
byId("teacherClose").addEventListener("click",function(){closeModal("teacherModal")});
byId("saveSettings").addEventListener("click",function(){
  var names=cleanLines(byId("studentNames").value),destinations=cleanLines(byId("destinations").value);
  settings.students=names.length?names:DEFAULT_STUDENTS;settings.destinations=destinations.length?destinations:DEFAULT_DESTINATIONS;settings.pin=byId("newPin").value||"1234";
  persist();render();byId("teacherStatus").textContent="Settings saved.";
});
byId("returnEveryone").addEventListener("click",function(){
  var end=now();active.forEach(function(item){history.push({name:item.name,destination:item.destination,leftAt:item.leftAt,returnedAt:end,minutes:Math.max(1,Math.round((end-item.leftAt)/60000))})});active=[];persist();render();updateDashboard();renderHistory();refreshExport();byId("teacherStatus").textContent="Everyone returned.";
});
byId("clearHistory").addEventListener("click",function(){
  if(!confirm("Clear all completed history?"))return;history=[];persist();render();updateDashboard();renderHistory();refreshExport();byId("teacherStatus").textContent="History cleared.";
});
byId("historySearch").addEventListener("input",renderHistory);
byId("historySort").addEventListener("change",renderHistory);
byId("viewToday").addEventListener("click",function(){historyRange="today";renderHistory()});
byId("viewWeek").addEventListener("click",function(){historyRange="week";renderHistory()});
byId("viewAll").addEventListener("click",function(){historyRange="all";renderHistory()});
byId("exportRange").addEventListener("change",refreshExport);
byId("exportSort").addEventListener("change",refreshExport);
byId("copyCsv").addEventListener("click",function(){refreshExport();byId("exportText").select();document.execCommand("copy");byId("teacherStatus").textContent="CSV copied."});
byId("downloadCsv").addEventListener("click",function(){
  var blob=new Blob([buildCsv()],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="classroom-signout-"+byId("exportRange").value+".csv";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);byId("teacherStatus").textContent="CSV download started.";
});

document.addEventListener("gesturestart",function(e){e.preventDefault()},{passive:false});
document.addEventListener("gesturechange",function(e){e.preventDefault()},{passive:false});
document.addEventListener("gestureend",function(e){e.preventDefault()},{passive:false});

render();
setInterval(render,30000);
if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("service-worker.js")});

window.__appTest={
  getActive:function(){return active.slice()},
  getHistory:function(){return history.slice()},
  openTeacher:openTeacher,
  render:render
};
})();
