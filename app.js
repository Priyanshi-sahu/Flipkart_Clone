const express = require("express")
const mongoose=require("mongoose") 
const bodyParser= require("body-parser")
const multer = require("multer")
const session = require('express-session')
const bcrypt = require('bcrypt')
const Razorpay = require('razorpay')

const flipcart = express()

flipcart.use(express.static(__dirname + '/public'))

flipcart.set('views', __dirname + '/views')

flipcart.set('view engine', 'ejs')

flipcart.use(bodyParser.urlencoded({extended:true}))

mongoose.connect('mongodb://localhost:27017/flipcart')

const categorySchema = new mongoose.Schema({
    categoryname:String
})

const categorymodel = mongoose.model('categorymodel', categorySchema)


const FormSchema = new mongoose.Schema({
    image_insert:String,
    title:String,
    price:String, 
    categoryname:String,
    
})

const Formschema = mongoose.model('Formschema', FormSchema)

const cartSchema = new mongoose.Schema({
    userid:String,
    items:[{
       productid:{type:mongoose.Schema.Types.ObjectId, ref:Formschema},
       quantity:{type:Number, default:1},
    }
    ],
 })
 const cartdata = mongoose.model('cartdata', cartSchema)
 
 const RegistrationSchema = new mongoose.Schema({
    username:String,
    password:String,
    email:String,
    phone:Number,
    
})

const Registrationschema = mongoose.model('Registrationschema', RegistrationSchema)

const storage = multer.diskStorage({
    destination: 'public/pimage/',
    filename: (req,file,temp)=>{
        temp(null, file.originalname)
    }
})

const upload = multer({storage:storage})

flipcart.use(session({secret:'your-own-key',resave:true,saveUninitialized:true}))

 const auth = (req,res,next)=>{
    if(req.session && req.session.user && req.session.password){
        return next()
    }
    else{
        
        res.redirect('/loginpage')
        
    }
 }

 const userauth = (req,res,next)=>{
    if(req.session && req.session.user){
        return next()
    }
    else{
        
        res.redirect('/userlogin')
        
    }
 }


flipcart.get('/admin_insert', async (req,res)=>{
    const fdata=await categorymodel.find()    
    res.render('admin_insert',{fdata})     //to open file thats why we use getnmethod
})
    
    flipcart.post('/submitproduct', upload.single('image_insert') , async (req,res)=>{
         
        const { title, price,categoryname } = req.body //to get all body of form
        const image_insert = '/pimage/' + req.file.originalname
    
        const new_form = new Formschema({
            image_insert,
            price,
            title,
            categoryname,
        })
        
        await new_form.save()
    
        res.redirect('/display')
    })

flipcart.get('/display', auth,async (req,res)=>{
    const getdata = await Formschema.find()
    res.render('display',{getdata})
})

flipcart.post('/delete/:id',async(req,res)=>{
    const productid = req.params.id
    await Formschema.findByIdAndDelete(productid)
    res.redirect('/display')
})

flipcart.post('/updatedata/:id',async(req,res)=>{
    const productid = req.params.id
    const getdata = await Formschema.findById(productid)
    res.render('updatedata',{getdata})
})

flipcart.post('/submit/:id', upload.single('image_insert') , async (req,res)=>{
    const updateddata= req.params.id 
    const { title, price} = req.body //to get all body of form
    const image_insert = '/pimage/' + req.file.originalname

    await Formschema.findByIdAndUpdate(updateddata, {
        title,
        image_insert,
        price,

    })
    
    
    res.redirect('/display')
})

flipcart.get('/home',async (req,res)=>{
    const gethome = await Formschema.find()
    res.render('home',{gethome})

})

flipcart.get('/navbar',async (req,res)=>{
    res.render('navbar')
})
flipcart.get('/footer',async (req,res)=>{
    res.render('footer')
})

flipcart.get('/panel', auth, async(req,res)=>{
    username=req.session.user
    password=req.session.password
    if(username=="admin"){
      
       if(password=="admin123"){
        res.render('panel')
       }
       else{
        console.log("password wrong")
       }
    }
    else{
        console.log("username is wrong")
        res.redirect('/loginpage')
    }
})



flipcart.get('/loginpage',async (req,res)=>{
    
    res.render('login')
})
flipcart.post('/login',async (req,res)=>{
    const{username,password}= req.body
    if(username=="admin" && password=="admin123"){
        req.session.user=username
        req.session.password=password
        res.redirect('/panel')
    }
    else{
        
        res.redirect('/loginpage')
    }
})

flipcart.post('/add-cart/:id',userauth, async (req, res) =>{
    const productid = req.params.id
    const userid = req.session.user 
    let cart = await cartdata.findOne({userid})
  
    if(!cart){
       cart = new cartdata({userid})
    }
 
    const cartproduct  = cart.items.findIndex(item => String(item.productid)===productid)
 
    if(cartproduct!==-1){
       cart.items[cartproduct].quantity+=1
    }
    else{
       cart.items.push({productid, quantity:1})
    }
    await cart.save()
    res.redirect('/cart')
 
 })
 


flipcart.post('/increasequantity/:id',async(req,res)=>{
    const userid = req.session.user
    const itemid = req.params.id
    const cart = await cartdata.findOne({userid})
    const cartitem = cart.items.find(item => String(item._id)===itemid)
    cartitem.quantity+=1
    await cart.save()
    res.redirect('/cart')
})

flipcart.post('/decreasequantity/:id',async(req,res)=>{
    const userid = req.session.user
    const itemid = req.params.id
    const cart = await cartdata.findOne({userid})
    const cartitem = cart.items.find(item => String(item._id)===itemid)
    cartitem.quantity-=1
    await cart.save()
    res.redirect('/cart')
})


// flipcart.post('/checkout',async(req,res)=>{
//     const userid = req.session.user
//      const totalprice = req.body
//      const getpreview = await cartdata.find()
//     res.render('preview', {getpreview , totalprice})
// })

flipcart.get('/registration',async(req,res)=>{
    res.render('user/registration')
})

flipcart.post('/userregistration',async(req,res)=>{
  const{username,password,email,phone}=req.body
  const exist = await Registrationschema.findOne({$or:[{username},{email},{phone}]})
  if(exist){
   res.send("Already exist")
  }
  else{
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Registrationschema({ username, password: hashedPassword, email, phone });
        
    await newUser.save()
  }
  res.redirect('userlogin')
})

flipcart.get('/userlist',async(req,res)=>{
    const getuser = await Registrationschema.find()
    res.render('userlist',{getuser})
})

flipcart.get('/userlogin',async(req,res)=>{
    res.render('user/login')
})
flipcart.post('/user/login',async(req,res)=>{
   const {username,password} = req.body
   const userLogin = await Registrationschema.findOne({username})

   if(!userLogin){
    res.redirect("/registration")
   }
   else {
    if(password == userLogin.password){
    req.session.user = userLogin._id
    res.redirect("/cart")
    }
    else{
        res.send("wrong crediential")
       }
   }


   
})

flipcart.get('/userpanel',userauth,async (req,res)=>{
    
    res.render('user/userpanel')
})

//userauth is like a middleware or permission of particular user

  flipcart.get('/cart',userauth, async (req, res) =>{  
    const userid = req.session.user
    const cardpage = await cartdata.findOne({userid}).populate('items.productid')
    res.render('cart',{cardpage})
 })

 //payment gateway

 const razorpay = new Razorpay({
    key_id : 'rzp_test_ckfG9WZwdZRwVP',
 key_secret:'k4x5OMecaqrfcRWZToon2RXV'
  })
  
  flipcart.post('/create-order', async (req, res) => {
    const { totalprice } = req.body;
 
    if (!totalprice) {
        return res.status(400).json({ error: 'Total amount is required' });
    }
 
    try {
        const orderOptions = {
            amount: totalprice * 100, // converting to paise
            currency: 'INR',
            receipt: 'receipt#1',
            payment_capture: 1
        };
 
        const order = await razorpay.orders.create(orderOptions);
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
 });

 flipcart.get('/category',async(req,res)=>{
    res.render("category")
 })
 
 flipcart.post('/categorydata',async(req,res)=>{
    const {categoryname}=req.body
    const cdata = new categorymodel({
        categoryname,
    })
    await cdata.save()
    res.redirect('admin_insert')
 })

 flipcart.get('/api/products',async(req,res)=>{
    try{
        const products= await Formschema.find();
        res.json(products);
    }
    catch(err){
       res.status(500).json({message:err.message});
    }
 })
 flipcart.get('/api/products/:id',async(req,res)=>{
    try{
        const product= await Formschema.findById(req.params.id);
        if(product == null){
            return res.status(404).json({message:'cannot find product'});
        }
        res.json(product);
    }
    catch(err){
       res.status(500).json({message:err.message});
    }
 })

 flipcart.get('/api/cart_api/:id',async(req,res)=>{
    const cartapi=req.params.id
    try{
        const carts= await cartdata.findById(cartapi);
        res.json(carts);
    }
    catch(err){
       res.status(500).json({message:err.message});
    }
 })

 

 //creating api for particular user by giving id in url
 
flipcart.get('/api/registeruser/:id',async(req,res)=>{
    const userapi=req.params.id
    try{
        const userdata=await Registrationschema.findById(userapi);
        res.json(userdata);
    }
    catch(err){
        res.status(500).json({message:err.message});
    }
})
flipcart.get('/fetchapi',async(req,res)=>{
    res.render("fetchapi")
 })

flipcart.listen(3000,()=>{
    console.log("server created")
})    