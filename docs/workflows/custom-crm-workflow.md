# Custom CRM Workflow - Main Overview

This diagram shows the complete Lead → Prospect → Opportunity progression for the custom HaloPSA CRM integration.

## Complete Workflow Overview

```mermaid
flowchart TD
    subgraph LEAD_FLOW ["🎯 LEAD LIFECYCLE"]
        L1(["New Lead"]) --> L2(["Researching"])
        L2 --> L3(["Contacted"])
        L3 --> L4(["Engaged"])
        L3 --> L5(["No Interest"])
        L3 --> L6(["Do Not Contact"])
        L2 --> L7(["Invalid Data"])
        
        L1 -.->|"Claim for research"| L2
        L2 -.->|"Establish contact"| L3
        L3 -.->|"Interested"| L4
        L3 -.->|"Not interested"| L5
        L3 -.->|"Opt-out request"| L6
        L2 -.->|"Bad data"| L7
    end

    subgraph PROSPECT_FLOW ["🔍 PROSPECT LIFECYCLE"]
        P1(["New Prospect"]) --> P2(["Prospecting"])
        P2 --> P3(["Qualified"])
        P2 --> P4(["Disqualified"])
        
        P1 -.->|"Identify problem"| P2
        P2 -.->|"Meets criteria"| P3
        P2 -.->|"Doesn't qualify"| P4
    end

    subgraph OPPORTUNITY_FLOW ["💰 OPPORTUNITY LIFECYCLE"]
        O1(["New Opportunity"]) --> O2(["Progressing"])
        O2 --> O3(["Negotiation"])
        O3 --> O4(["Won"])
        O3 --> O5(["Lost"])
        
        O1 -.->|"Propose solution"| O2
        O2 -.->|"Discuss terms"| O3
        O3 -.->|"Close deal"| O4
        O3 -.->|"Deal lost"| O5
    end

    %% Promotion flows
    L4 ==>|"Convert to Prospect"| P1
    P3 ==>|"Promote to Opportunity"| O1

    %% Styling
    classDef leadNode fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef prospectNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef opportunityNode fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
    classDef conversionNode fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    
    class L1,L2,L3,L4,L5,L6,L7 leadNode
    class P1,P2,P3,P4 prospectNode
    class O1,O2,O3,O4,O5 opportunityNode
    class L4,P3 conversionNode
```

## Workflow Summary

### 🎯 Lead Lifecycle (7 States)
- **New Lead** → **Researching** → **Contacted** → **Engaged** ✅
- Exit paths: No Interest, Do Not Contact, Invalid Data

### 🔍 Prospect Lifecycle (4 States)  
- **New Prospect** → **Prospecting** → **Qualified** ✅
- Exit path: Disqualified

### 💰 Opportunity Lifecycle (5 States)
- **New Opportunity** → **Progressing** → **Negotiation** → **Won/Lost**

### 🚀 Automation Rules
- **Lead (Engaged)** → Auto-convert to **Prospect**
- **Prospect (Qualified + Fit Score ≥70)** → Auto-promote to **Opportunity**

---
*This workflow is implemented in the Custom CRM Workflow Integrator service*