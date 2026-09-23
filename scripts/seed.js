#!/usr/bin/env node
/**
 * DentiFlow Database Seed Script (JavaScript - no ts-node required)
 * Used by db-setup.js on Render/production deployments.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const Role = { ADMIN:"ADMIN", DENTIST:"DENTIST", RECEPTIONIST:"RECEPTIONIST", ASSISTANT:"ASSISTANT", ACCOUNTANT:"ACCOUNTANT", INVENTORY_MANAGER:"INVENTORY_MANAGER" };
const Gender = { MALE:"MALE", FEMALE:"FEMALE" };
const AppointmentStatus = { SCHEDULED:"SCHEDULED", CONFIRMED:"CONFIRMED", CHECKED_IN:"CHECKED_IN", IN_TREATMENT:"IN_TREATMENT", COMPLETED:"COMPLETED", CANCELLED:"CANCELLED", NO_SHOW:"NO_SHOW" };
const PaymentMethod = { CASH:"CASH", BANK_TRANSFER:"BANK_TRANSFER" };
const ExpenseCategory = { RENT:"RENT", UTILITIES:"UTILITIES", SALARIES:"SALARIES", SUPPLIES:"SUPPLIES", MAINTENANCE:"MAINTENANCE", MARKETING:"MARKETING" };

async function main() {
  console.log("🌱 Starting DentiFlow database seed...");

  // Clinic Settings
  for (const s of [
    { key:"clinicName", value:"DentalCare Pro" }, { key:"address", value:"12, Rajpath Avenue, Koramangala" },
    { key:"city", value:"Bengaluru" }, { key:"state", value:"Karnataka" }, { key:"phone", value:"080-46001234" },
    { key:"email", value:"info@dentalcarepro.in" }, { key:"currency", value:"INR" }, { key:"timezone", value:"Asia/Kolkata" },
    { key:"invoicePrefix", value:"INV" }, { key:"taxPercent", value:"18" }, { key:"appointmentDuration", value:"30" },
    { key:"workingHoursStart", value:"09:00" }, { key:"workingHoursEnd", value:"19:00" }, { key:"gstin", value:"29ABCDE1234F1ZX" },
  ]) { await prisma.clinicSetting.upsert({ where:{key:s.key}, update:{value:s.value}, create:s }); }
  console.log("✓ Clinic settings");

  // Users
  const hp = await bcrypt.hash("Admin@123", 10);
  const dp = await bcrypt.hash("Dentist@123", 10);
  const rp = await bcrypt.hash("Recept@123", 10);
  const ap = await bcrypt.hash("Account@123", 10);
  const ip = await bcrypt.hash("Invent@123", 10);

  const admin = await prisma.user.upsert({ where:{email:"admin@dentalcare.com"}, update:{}, create:{email:"admin@dentalcare.com",name:"Admin User",password:hp,role:Role.ADMIN,phone:"9876543210"} });
  const d1u = await prisma.user.upsert({ where:{email:"dentist@dentalcare.com"}, update:{}, create:{email:"dentist@dentalcare.com",name:"Dr. Ananya Rao",password:dp,role:Role.DENTIST,phone:"9876543211"} });
  const d2u = await prisma.user.upsert({ where:{email:"dentist2@dentalcare.com"}, update:{}, create:{email:"dentist2@dentalcare.com",name:"Dr. Arjun Mehta",password:dp,role:Role.DENTIST,phone:"9876543212"} });
  const d3u = await prisma.user.upsert({ where:{email:"dentist3@dentalcare.com"}, update:{}, create:{email:"dentist3@dentalcare.com",name:"Dr. Priya Krishnan",password:dp,role:Role.DENTIST,phone:"9876543213"} });
  await prisma.user.upsert({ where:{email:"reception@dentalcare.com"}, update:{}, create:{email:"reception@dentalcare.com",name:"Meena Sharma",password:rp,role:Role.RECEPTIONIST,phone:"9876543214"} });
  await prisma.user.upsert({ where:{email:"accountant@dentalcare.com"}, update:{}, create:{email:"accountant@dentalcare.com",name:"Rajesh Kumar",password:ap,role:Role.ACCOUNTANT,phone:"9876543215"} });
  await prisma.user.upsert({ where:{email:"inventory@dentalcare.com"}, update:{}, create:{email:"inventory@dentalcare.com",name:"Sunita Patel",password:ip,role:Role.INVENTORY_MANAGER,phone:"9876543216"} });
  await prisma.user.upsert({ where:{email:"assistant@dentalcare.com"}, update:{}, create:{email:"assistant@dentalcare.com",name:"Ravi Shankar",password:rp,role:Role.ASSISTANT,phone:"9876543217"} });
  console.log("✓ Users");

  // Doctors + schedules
  const doc1 = await prisma.doctor.upsert({ where:{userId:d1u.id}, update:{}, create:{userId:d1u.id,qualification:"BDS, MDS (Oral Surgery)",specialization:"Oral Surgery & Implantology",registrationNumber:"KAR-DEN-12345",bio:"Dr. Ananya Rao has over 10 years of experience in oral surgery and implantology."} });
  const doc2 = await prisma.doctor.upsert({ where:{userId:d2u.id}, update:{}, create:{userId:d2u.id,qualification:"BDS, MDS (Orthodontics)",specialization:"Orthodontics & Pediatric Dentistry",registrationNumber:"KAR-DEN-23456",bio:"Dr. Arjun Mehta specializes in orthodontics and pediatric dental care."} });
  const doc3 = await prisma.doctor.upsert({ where:{userId:d3u.id}, update:{}, create:{userId:d3u.id,qualification:"BDS, MDS (Endodontics)",specialization:"Endodontics & Restorative Dentistry",registrationNumber:"KAR-DEN-34567",bio:"Dr. Priya Krishnan is an expert in root canal therapy and restorative procedures."} });
  for (const doc of [doc1,doc2,doc3]) {
    for (let day=1;day<=6;day++) {
      const ex = await prisma.doctorSchedule.findFirst({where:{doctorId:doc.id,dayOfWeek:day}});
      if (!ex) await prisma.doctorSchedule.create({data:{doctorId:doc.id,dayOfWeek:day,startTime:"09:00",endTime:"18:00"}});
    }
  }
  console.log("✓ Doctors + schedules");

  // Rooms
  const rooms = [];
  for (const r of [{name:"Treatment Room 1",description:"General dentistry"},{name:"Treatment Room 2",description:"Orthodontics"},{name:"Surgery Room",description:"Oral surgery & implants"},{name:"X-Ray Room",description:"Radiography"}]) {
    let rm = await prisma.room.findFirst({where:{name:r.name}});
    if (!rm) rm = await prisma.room.create({data:r});
    rooms.push(rm);
  }
  console.log("✓ Rooms");

  // Treatment Categories + Treatments
  const cats = {};
  for (const c of ["Consultation","Preventive","Restorative","Surgical","Cosmetic","Orthodontic","Diagnostic"]) {
    cats[c] = await prisma.treatmentCategory.upsert({where:{name:c},update:{},create:{name:c}});
  }
  const trtData = [
    {name:"Consultation",cat:"Consultation",desc:"Initial consultation and examination",dur:30,price:500,tax:0},
    {name:"Dental X-Ray (Periapical)",cat:"Diagnostic",desc:"Single tooth radiograph",dur:15,price:300,tax:18},
    {name:"OPG (Panoramic X-Ray)",cat:"Diagnostic",desc:"Full mouth panoramic radiograph",dur:20,price:800,tax:18},
    {name:"Dental Cleaning (Scaling)",cat:"Preventive",desc:"Professional teeth cleaning and scaling",dur:45,price:1500,tax:18},
    {name:"Fluoride Treatment",cat:"Preventive",desc:"Topical fluoride application",dur:20,price:600,tax:18},
    {name:"Composite Filling (1 Surface)",cat:"Restorative",desc:"Tooth-colored composite resin filling",dur:45,price:2000,tax:18},
    {name:"Composite Filling (2+ Surfaces)",cat:"Restorative",desc:"Multi-surface composite filling",dur:60,price:3000,tax:18},
    {name:"Root Canal Treatment (Anterior)",cat:"Restorative",desc:"Single canal endodontic therapy",dur:90,price:5000,tax:18},
    {name:"Root Canal Treatment (Posterior)",cat:"Restorative",desc:"Multi-canal endodontic therapy",dur:120,price:8000,tax:18},
    {name:"Dental Crown (PFM)",cat:"Restorative",desc:"Porcelain fused to metal crown",dur:60,price:7000,tax:18},
    {name:"Dental Crown (Zirconia)",cat:"Restorative",desc:"All-ceramic zirconia crown",dur:60,price:12000,tax:18},
    {name:"Tooth Extraction (Simple)",cat:"Surgical",desc:"Simple tooth extraction",dur:30,price:1500,tax:18},
    {name:"Surgical Extraction (Impacted)",cat:"Surgical",desc:"Surgical removal of impacted tooth",dur:60,price:5000,tax:18},
    {name:"Dental Implant",cat:"Surgical",desc:"Titanium implant placement",dur:90,price:35000,tax:18},
    {name:"Teeth Whitening",cat:"Cosmetic",desc:"In-office laser teeth whitening",dur:60,price:8000,tax:18},
    {name:"Veneers (per tooth)",cat:"Cosmetic",desc:"Porcelain laminate veneer",dur:90,price:15000,tax:18},
    {name:"Orthodontic Consultation",cat:"Orthodontic",desc:"Braces/aligner consultation",dur:45,price:500,tax:0},
    {name:"Metal Braces (Full)",cat:"Orthodontic",desc:"Traditional metal orthodontic brackets",dur:60,price:25000,tax:18},
    {name:"Clear Aligners",cat:"Orthodontic",desc:"Transparent removable aligners",dur:60,price:45000,tax:18},
    {name:"Denture (Complete)",cat:"Restorative",desc:"Full removable denture per arch",dur:60,price:12000,tax:18},
  ];
  const trts = [];
  let tc=0;
  for (const t of trtData) {
    let ex = await prisma.treatment.findFirst({where:{name:t.name}});
    if (!ex) ex = await prisma.treatment.create({data:{treatmentId:`TRT-${String(++tc).padStart(3,"0")}`,name:t.name,categoryId:cats[t.cat]?.id,description:t.desc,duration:t.dur,price:t.price,taxPercent:t.tax}});
    else tc++;
    trts.push(ex);
  }
  console.log("✓ Treatments");

  // Suppliers
  const supps = [];
  let sc=0;
  for (const s of [{name:"MediDent Supplies Pvt Ltd",contact:"Anil Bose",phone:"9800000001",email:"sales@medident.in"},{name:"DentoTech India",contact:"Kavitha Rao",phone:"9800000002",email:"orders@dentotech.in"},{name:"National Dental Corp",contact:"Prakash Menon",phone:"9800000003",email:"b2b@ndc.in"},{name:"SurgMed Pharma",contact:"Ritu Sharma",phone:"9800000004",email:"supply@surgmed.in"},{name:"OrthoWorld India",contact:"Deepak Nair",phone:"9800000005",email:"info@orthoworld.in"}]) {
    let ex = await prisma.supplier.findFirst({where:{companyName:s.name}});
    if (!ex) ex = await prisma.supplier.create({data:{supplierId:`SUP-${String(++sc).padStart(4,"0")}`,companyName:s.name,contactPerson:s.contact,phone:s.phone,email:s.email,paymentTerms:"Net 30"}});
    else sc++;
    supps.push(ex);
  }

  // Inventory
  const invCats = {};
  for (const c of ["Dental Materials","Instruments","Medications","PPE","X-Ray","Orthodontic Supplies","Surgical Supplies"]) {
    invCats[c] = await prisma.inventoryCategory.upsert({where:{name:c},update:{},create:{name:c}});
  }
  let ic=0;
  for (const item of [{name:"Composite Resin (A2 Shade)",cat:"Dental Materials",sku:"COMP-A2-001",qty:15,min:5,price:1200,unit:"syringe"},{name:"Dental Impression Material",cat:"Dental Materials",sku:"IMPR-001",qty:8,min:3,price:800,unit:"kit"},{name:"Dental Cement (GIC)",cat:"Dental Materials",sku:"GIC-001",qty:4,min:5,price:650,unit:"pack"},{name:"Dental Gloves (Medium)",cat:"PPE",sku:"GLOVE-M-001",qty:200,min:50,price:8,unit:"pair"},{name:"Surgical Masks",cat:"PPE",sku:"MASK-001",qty:150,min:100,price:5,unit:"piece"},{name:"Amoxicillin 500mg",cat:"Medications",sku:"AMOX-500",qty:50,min:20,price:12,unit:"strip"},{name:"Ibuprofen 400mg",cat:"Medications",sku:"IBU-400",qty:30,min:20,price:10,unit:"strip"},{name:"Dental X-Ray Film",cat:"X-Ray",sku:"XRAY-F-001",qty:100,min:30,price:25,unit:"piece"},{name:"Orthodontic Brackets (Metal)",cat:"Orthodontic Supplies",sku:"BRKT-M-001",qty:50,min:10,price:150,unit:"set"},{name:"Extraction Forceps Set",cat:"Instruments",sku:"FORC-001",qty:3,min:2,price:5000,unit:"set"},{name:"Dental Scalers Set",cat:"Instruments",sku:"SCAL-001",qty:5,min:2,price:2500,unit:"set"},{name:"Local Anesthetic (Lignocaine)",cat:"Medications",sku:"LIGN-001",qty:100,min:30,price:15,unit:"vial"}]) {
    const ex = await prisma.inventoryItem.findFirst({where:{name:item.name}});
    if (!ex) {
      const status = item.qty===0?"OUT_OF_STOCK":item.qty<=item.min?"LOW_STOCK":"IN_STOCK";
      await prisma.inventoryItem.create({data:{itemId:`ITEM-${String(++ic).padStart(4,"0")}`,name:item.name,categoryId:invCats[item.cat]?.id,sku:item.sku,supplierId:supps[0]?.id,purchasePrice:item.price,quantity:item.qty,unit:item.unit,minStockLevel:item.min,status}});
    } else ic++;
  }
  console.log("✓ Suppliers + Inventory");

  // Patients
  const patData = [
    {fn:"Aarav",ln:"Sharma",dob:"1990-05-15",gender:Gender.MALE,phone:"9811111111",email:"aarav.sharma@email.com",city:"Bengaluru"},
    {fn:"Priya",ln:"Reddy",dob:"1985-08-22",gender:Gender.FEMALE,phone:"9822222222",email:"priya.reddy@email.com",city:"Bengaluru"},
    {fn:"Rahul",ln:"Verma",dob:"1995-03-10",gender:Gender.MALE,phone:"9833333333",email:"rahul.verma@email.com",city:"Mysuru"},
    {fn:"Sneha",ln:"Kumar",dob:"1992-11-30",gender:Gender.FEMALE,phone:"9844444444",email:"sneha.kumar@email.com",city:"Bengaluru"},
    {fn:"Vikram",ln:"Singh",dob:"1978-07-04",gender:Gender.MALE,phone:"9855555555",email:"vikram.singh@email.com",city:"Bengaluru"},
    {fn:"Deepika",ln:"Nair",dob:"1998-01-18",gender:Gender.FEMALE,phone:"9866666666",email:"deepika.nair@email.com",city:"Mangaluru"},
    {fn:"Karthik",ln:"Iyer",dob:"1988-09-25",gender:Gender.MALE,phone:"9877777777",email:"karthik.iyer@email.com",city:"Bengaluru"},
    {fn:"Anita",ln:"Pillai",dob:"2000-04-12",gender:Gender.FEMALE,phone:"9888888888",email:"anita.pillai@email.com",city:"Bengaluru"},
    {fn:"Suresh",ln:"Babu",dob:"1970-12-01",gender:Gender.MALE,phone:"9899999999",email:"suresh.babu@email.com",city:"Hubballi"},
    {fn:"Meera",ln:"Krishnan",dob:"1993-06-20",gender:Gender.FEMALE,phone:"9800011111",email:"meera.krishnan@email.com",city:"Bengaluru"},
    {fn:"Rohan",ln:"Desai",dob:"1987-02-14",gender:Gender.MALE,phone:"9800022222",email:"rohan.desai@email.com",city:"Belagavi"},
    {fn:"Lakshmi",ln:"Venkat",dob:"1975-10-08",gender:Gender.FEMALE,phone:"9800033333",email:"lakshmi.venkat@email.com",city:"Bengaluru"},
    {fn:"Aditya",ln:"Kulkarni",dob:"2002-07-30",gender:Gender.MALE,phone:"9800044444",email:"aditya.kulkarni@email.com",city:"Bengaluru"},
    {fn:"Pooja",ln:"Gowda",dob:"1996-03-16",gender:Gender.FEMALE,phone:"9800055555",email:"pooja.gowda@email.com",city:"Tumakuru"},
    {fn:"Naveen",ln:"Rao",dob:"1983-08-05",gender:Gender.MALE,phone:"9800066666",email:"naveen.rao@email.com",city:"Bengaluru"},
    {fn:"Rakshitha",ln:"Semala",dob:"2002-08-09",gender:Gender.FEMALE,phone:"8639975744",email:"srakshitha912@gmail.com",city:"Bengaluru"},
  ];
  const pats = [];
  let pc=0;
  for (const p of patData) {
    let ex = await prisma.patient.findFirst({where:{phone:p.phone}});
    if (!ex) ex = await prisma.patient.create({data:{patientId:`PAT-${String(++pc).padStart(5,"0")}`,firstName:p.fn,lastName:p.ln,dateOfBirth:new Date(p.dob),gender:p.gender,phone:p.phone,email:p.email,city:p.city,state:"Karnataka",country:"India",registeredBy:admin.id,medicalHistory:{create:{diabetes:false,hypertension:false}},dentalInfo:{create:{smokingStatus:"NON_SMOKER",treatmentConsent:true,privacyConsent:true}},dentalChart:{create:{}}}});
    else pc++;
    pats.push(ex);
  }
  console.log("✓ Patients (16 total, including Rakshitha Semala)");

  // Appointments
  const today = new Date(); today.setHours(0,0,0,0);
  const aptData = [
    {pi:0,di:0,off:0,s:"09:00",e:"10:00",status:AppointmentStatus.CONFIRMED,ti:0},
    {pi:1,di:0,off:0,s:"10:30",e:"12:00",status:AppointmentStatus.IN_TREATMENT,ti:7},
    {pi:2,di:1,off:0,s:"09:30",e:"10:30",status:AppointmentStatus.CHECKED_IN,ti:16},
    {pi:3,di:2,off:0,s:"11:00",e:"12:00",status:AppointmentStatus.SCHEDULED,ti:3},
    {pi:4,di:0,off:0,s:"14:00",e:"15:00",status:AppointmentStatus.SCHEDULED,ti:11},
    {pi:5,di:1,off:0,s:"15:30",e:"16:00",status:AppointmentStatus.SCHEDULED,ti:0},
    {pi:0,di:2,off:1,s:"09:00",e:"10:30",status:AppointmentStatus.SCHEDULED,ti:8},
    {pi:6,di:0,off:1,s:"10:00",e:"11:00",status:AppointmentStatus.SCHEDULED,ti:3},
    {pi:7,di:1,off:1,s:"11:00",e:"12:00",status:AppointmentStatus.SCHEDULED,ti:5},
    {pi:1,di:2,off:-1,s:"10:00",e:"11:30",status:AppointmentStatus.COMPLETED,ti:7},
    {pi:8,di:0,off:-1,s:"14:00",e:"15:00",status:AppointmentStatus.COMPLETED,ti:3},
    {pi:9,di:1,off:-2,s:"09:00",e:"10:00",status:AppointmentStatus.COMPLETED,ti:0},
    {pi:2,di:2,off:-3,s:"11:00",e:"12:30",status:AppointmentStatus.CANCELLED,ti:9},
    {pi:10,di:0,off:2,s:"09:00",e:"10:00",status:AppointmentStatus.SCHEDULED,ti:0},
    {pi:11,di:1,off:3,s:"14:00",e:"15:30",status:AppointmentStatus.SCHEDULED,ti:17},
    {pi:3,di:0,off:-5,s:"09:00",e:"10:00",status:AppointmentStatus.NO_SHOW,ti:3},
    {pi:12,di:2,off:-7,s:"10:00",e:"11:00",status:AppointmentStatus.COMPLETED,ti:14},
    {pi:13,di:0,off:5,s:"15:00",e:"16:00",status:AppointmentStatus.SCHEDULED,ti:5},
    {pi:14,di:1,off:7,s:"09:00",e:"10:30",status:AppointmentStatus.SCHEDULED,ti:18},
    {pi:4,di:2,off:-14,s:"11:00",e:"12:00",status:AppointmentStatus.COMPLETED,ti:11},
    {pi:15,di:0,off:1,s:"10:00",e:"11:00",status:AppointmentStatus.SCHEDULED,ti:3},
  ];
  const docs = [doc1,doc2,doc3];
  let ac=0;
  const apts = [];
  for (const a of aptData) {
    const date = new Date(today); date.setDate(date.getDate()+a.off);
    const pat=pats[a.pi]; const doc=docs[a.di]; const room=rooms[a.di%rooms.length]; const trt=trts[a.ti];
    if (!pat||!doc) continue;
    const aptId=`APT-${String(++ac).padStart(5,"0")}`;
    const ex = await prisma.appointment.findFirst({where:{appointmentId:aptId}});
    if (!ex) {
      const apt = await prisma.appointment.create({data:{appointmentId:aptId,patientId:pat.id,doctorId:doc.id,roomId:room?.id,date,startTime:a.s,endTime:a.e,status:a.status,treatments:trt?{create:[{treatmentId:trt.id}]}:undefined}});
      apts.push({id:apt.id,patientId:apt.patientId,doctorId:apt.doctorId,status:apt.status});
    }
  }
  console.log("✓ Appointments");

  // Invoices + Payments
  const completed = apts.filter(a=>a.status==="COMPLETED");
  let inv=0,pay=0;
  for (const apt of completed.slice(0,8)) {
    const trt=trts[Math.floor(Math.random()*5)];
    const price=trt?.price??1500; const tax=price*0.18; const total=price+tax;
    const paid=inv%3===0?total:inv%3===1?total/2:0; const bal=total-paid;
    const status=paid>=total?"PAID":paid>0?"PARTIALLY_PAID":"UNPAID";
    const invoice = await prisma.invoice.create({data:{invoiceNumber:`INV-2026-${String(++inv).padStart(5,"0")}`,patientId:apt.patientId,doctorId:apt.doctorId,appointmentId:apt.id,dueDate:new Date(Date.now()+30*86400000),subtotal:price,taxPercent:18,taxAmount:tax,total,amountPaid:paid,balanceDue:bal,status,items:{create:[{treatmentId:trt?.id,description:trt?.name??"Dental Treatment",quantity:1,unitPrice:price,tax,amount:total}]}}});
    if (paid>0) await prisma.payment.create({data:{paymentId:`PAY-${String(++pay).padStart(5,"0")}`,invoiceId:invoice.id,patientId:apt.patientId,amount:paid,method:PaymentMethod.CASH,recordedById:admin.id}});
  }
  console.log("✓ Invoices + Payments");

  // Expenses
  let ec=0;
  for (const e of [{cat:ExpenseCategory.RENT,desc:"Monthly clinic rent",amount:50000,vendor:"Property Solutions"},{cat:ExpenseCategory.UTILITIES,desc:"Electricity bill",amount:8500,vendor:"BESCOM"},{cat:ExpenseCategory.SALARIES,desc:"Staff salaries - September",amount:180000,vendor:""},{cat:ExpenseCategory.SUPPLIES,desc:"Dental supply restock",amount:25000,vendor:"MediDent Supplies"},{cat:ExpenseCategory.MAINTENANCE,desc:"Dental chair servicing",amount:12000,vendor:"DentEquip Services"},{cat:ExpenseCategory.MARKETING,desc:"Google Ads - September",amount:5000,vendor:"Google LLC"}]) {
    const ex = await prisma.expense.findFirst({where:{description:e.desc}});
    if (!ex) await prisma.expense.create({data:{expenseId:`EXP-${String(++ec).padStart(5,"0")}`,category:e.cat,description:e.desc,amount:e.amount,date:new Date(),method:PaymentMethod.BANK_TRANSFER,vendor:e.vendor||undefined,createdById:admin.id}});
    else ec++;
  }
  console.log("✓ Expenses");

  // Notifications
  const users = await prisma.user.findMany({where:{isActive:true}});
  for (const user of users.slice(0,2)) {
    for (const n of [{type:"LOW_INVENTORY",title:"Low Stock Alert",msg:"Dental Cement (GIC) is running low."},{type:"APPOINTMENT_UPCOMING",title:"Appointment Reminder",msg:"You have 6 appointments scheduled for today."},{type:"INVOICE_OVERDUE",title:"Overdue Invoice",msg:"Invoice INV-2026-00002 is overdue."},{type:"EXPIRY_ALERT",title:"Expiry Warning",msg:"Ibuprofen 400mg expires in 90 days."}]) {
      const ex = await prisma.notification.findFirst({where:{userId:user.id,title:n.title}});
      if (!ex) await prisma.notification.create({data:{userId:user.id,type:n.type,title:n.title,message:n.msg,isRead:false}});
    }
  }
  console.log("✓ Notifications");

  // Feedbacks
  for (const fb of [{patientName:"Kavitha Sundaram",patientPhone:"9876543210",rating:5,category:"TREATMENT",comment:"Completely pain-free root canal treatment! Dr. Ananya was so gentle and explained each step. Exceptional clinic hygiene standards.",treatment:"Root Canal & Zirconia Crown",doctorName:"Dr. Ananya Rao",isPublic:true},{patientName:"Rahul Verma",patientPhone:"9811111111",rating:5,category:"DOCTOR",comment:"The 3D smile design preview was incredible! Extremely knowledgeable orthodontist, transparent pricing, and zero wait time.",treatment:"Invisible Aligners Consultation",doctorName:"Dr. Vikram Sethi",isPublic:true},{patientName:"Meera Krishnan",patientPhone:"9822222222",rating:5,category:"CLEANLINESS",comment:"Hospital-grade European sterilization standards and super polite reception desk. The mobile portal made everything effortless!",treatment:"Ultrasonic Teeth Cleaning & Scaling",doctorName:"Dr. Sneha Patil",isPublic:true},{patientName:"Amitabh Sen",patientPhone:"9833333333",rating:5,category:"GENERAL",comment:"Quick online booking, seamless UPI billing, and great diagnostic care. The best dental clinic in Bengaluru!",treatment:"Dental Implant Consultation",doctorName:"Dr. Ananya Rao",isPublic:true}]) {
    const ex = await prisma.feedback.findFirst({where:{patientName:fb.patientName,comment:fb.comment}});
    if (!ex) await prisma.feedback.create({data:{...fb}});
  }
  console.log("✓ Feedbacks");

  console.log("\n🎉 DentiFlow database seeded successfully!");
  console.log("Staff: admin@dentalcare.com / Admin@123");
  console.log("Patient: 8639975744 (Rakshitha Semala) | srakshitha912@gmail.com");
}

main().catch(e=>{console.error("❌ Seed error:",e);process.exit(1);}).finally(async()=>{await prisma.$disconnect();});
