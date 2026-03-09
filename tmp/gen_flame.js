const data = [];

function addNode(name, layer, start, width) {
  data.push({ name, layer, start, width });
}

let c = 0; // current running sum

// Total Cost: 100
addNode("Total Cost", 0, c, 100);

  // Procurement: 25
  let cProc = c;
  addNode("Procurement", 1, cProc, 25);
    // Raw Materials: 20
    let cRaw = cProc;
    addNode("Raw Materials", 2, cRaw, 20);
      // Metals: 12
      let cMet = cRaw;
      addNode("Metals", 3, cMet, 12);
        addNode("Iron", 4, cMet, 5);
        addNode("Steel", 4, cMet + 5, 5);
          addNode("Transport", 5, cMet + 5, 1);
          addNode("Tariffs", 5, cMet + 6, 1);
            addNode("Tax A", 6, cMet + 6, 0.5);
            addNode("Tax B", 6, cMet + 6.5, 0.5);
        addNode("Aluminum", 4, cMet + 10, 2);
      
      // Plastics: 5
      let cPlast = cMet + 12;
      addNode("Plastics", 3, cPlast, 5);
        addNode("Resin", 4, cPlast, 4);
          addNode("Oil", 5, cPlast, 3);
          addNode("Processing", 5, cPlast + 3, 1);
        addNode("Dyes", 4, cPlast + 4, 1);
      
      // Chemicals: 3
      let cChem = cPlast + 5;
      addNode("Chemicals", 3, cChem, 3);
    
    // Components: 5
    let cComp = cRaw + 20;
    addNode("Components", 2, cComp, 5);
      addNode("Microchips", 3, cComp, 4);
        addNode("Silicon", 4, cComp, 1);
        addNode("Manufacturing", 4, cComp + 1, 3);
          addNode("Cleanroom", 5, cComp + 1, 2);
          addNode("QA", 5, cComp + 3, 1);
      addNode("Wires", 3, cComp + 4, 1);

  // Manufacturing: 40
  let cMfg = cProc + 25;
  addNode("Manufacturing", 1, cMfg, 40);
    // Assembly: 20
    let cAssm = cMfg;
    addNode("Assembly", 2, cAssm, 20);
      addNode("Line A", 3, cAssm, 15);
        addNode("Labor (A)", 4, cAssm, 8);
        addNode("Machine Dep.", 4, cAssm + 8, 5);
        addNode("Energy", 4, cAssm + 13, 2);
      addNode("Line B", 3, cAssm + 15, 5);
        addNode("Labor (B)", 4, cAssm + 15, 4);
        addNode("Energy", 4, cAssm + 19, 1);
    
    // Testing & QA: 10
    let cQA = cAssm + 20;
    addNode("Testing & QA", 2, cQA, 10);
      addNode("Automated", 3, cQA, 8);
        addNode("Servers", 4, cQA, 5);
        addNode("Software Lic.", 4, cQA + 5, 3);
      addNode("Manual", 3, cQA + 8, 2);
    
    // Packaging: 10
    let cPkg = cQA + 10;
    addNode("Packaging", 2, cPkg, 10);
      addNode("Materials", 3, cPkg, 8);
        addNode("Cardboard", 4, cPkg, 5);
        addNode("Foam", 4, cPkg + 5, 3);
      addNode("Labor", 3, cPkg + 8, 2);

  // Logistics: 25
  let cLog = cMfg + 40;
  addNode("Logistics", 1, cLog, 25);
    // Transportation: 18
    let cTrans = cLog;
    addNode("Transportation", 2, cTrans, 18);
      addNode("Sea Freight", 3, cTrans, 10);
        addNode("Fuel", 4, cTrans, 6);
        addNode("Crew", 4, cTrans + 6, 2);
        addNode("Port Fees", 4, cTrans + 8, 2);
          addNode("Customs", 5, cTrans + 8, 1);
          addNode("Docking", 5, cTrans + 9, 1);
      addNode("Air Freight", 3, cTrans + 10, 5);
        addNode("Fuel", 4, cTrans + 10, 3);
        addNode("Fees", 4, cTrans + 13, 2);
      addNode("Road Transport", 3, cTrans + 15, 3);
    
    // Warehousing: 7
    let cWhse = cTrans + 18;
    addNode("Warehousing", 2, cWhse, 7);
      addNode("Rent", 3, cWhse, 4);
      addNode("Security", 3, cWhse + 4, 1);
      addNode("Ops", 3, cWhse + 5, 2);

  // Retail & Mgmt: 10
  let cRet = cLog + 25;
  addNode("Retail & Mgmt", 1, cRet, 10);
    // Marketing: 7
    let cMkt = cRet;
    addNode("Marketing", 2, cMkt, 7);
      addNode("Digital Ads", 3, cMkt, 5);
      addNode("Print", 3, cMkt + 5, 2);
    // Sales Comm.: 3
    let cSales = cMkt + 7;
    addNode("Sales Comm.", 2, cSales, 3);
      addNode("Region A", 3, cSales, 2);
      addNode("Region B", 3, cSales + 2, 1);

console.log(JSON.stringify({ rows: data }, null, 2));
