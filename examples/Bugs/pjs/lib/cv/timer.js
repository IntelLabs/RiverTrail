var timer={
  curInfo: {},
  startInfo: {},
  sumInfo: {},
  maxInfo: {},
  minInfo: {},
  numReports: {},
  reset: function() {
    this.curInfo={};
    this.startInfo={};
    this.sumInfo={};
    this.maxInfo={};
    this.minInfo={};
    this.numReports={};
  },
  isRunning: function(id) { return (id in this.startInfo); },
  start: function(id) {
    if (id in this.startInfo) throw id+" already timed";
    this.startInfo[id]=Date.now();
  },
  end: function(id) {
    if (id in this.startInfo) {
      this.curInfo[id]=Date.now()-this.startInfo[id];
    } else {
      throw id+" timer not started";
    }
  },
  report: function(reportElementId) {
    var data="";
    for (id in this.curInfo) if (this.curInfo.hasOwnProperty(id)) {
      if (id in this.sumInfo) {
        this.sumInfo[id]+=this.curInfo[id];
        this.minInfo[id]=Math.min(this.minInfo[id],this.curInfo[id]);
        this.maxInfo[id]=Math.max(this.maxInfo[id],this.curInfo[id]);
        ++this.numReports[id];
      } else {
        this.sumInfo[id]=this.curInfo[id];
        this.minInfo[id]=this.curInfo[id];
        this.maxInfo[id]=this.curInfo[id];
        this.numReports[id]=1;
      }
    }
    for (id in this.sumInfo) if (this.sumInfo.hasOwnProperty(id)) {
      data+=id+" "+this.minInfo[id]+" "+(this.sumInfo[id]/this.numReports[id]).toFixed(3)+" "+this.maxInfo[id]+" "+this.numReports[id]+"<br>";
    }
    document.getElementById(reportElementId).innerHTML=data;
    this.startInfo={};
    this.curInfo={};
  }
};
