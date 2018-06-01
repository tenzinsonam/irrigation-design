var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path=require('path');

var mainD1, lateralD1, width1, height1, eFlow1, nameP1, nameMPi1, nameLPi1, pressureChange1, mainV1, mainVloss1;

app.use(express.static(path.join(__dirname, '/cssFiles')))
app.use(express.static(path.join(__dirname, '/actions')))
app.use(express.static('project'))
app.use(express.static('htmlFiles'))    //try to improve??

app.set('view engine', 'ejs');

app.get('/', function(req, res){
    res.sendFile(__dirname + '/htmlFiles/indexNew.html');
});

app.get('/graph', function(req, res){
    res.render('appA',{
        width:width1,
        height:height1,
        nameP:nameP1,
        nameMPi:nameMPi1,
        nameLPi:nameLPi1,
        pressureChange:pressureChange1,
        mainV:mainV1,
        mainVloss:mainVloss1
    });
});

function second(mainD2, lateralD2, width2, height2, eFlow2, socket){
//lateralD = inch, lateralL=feet, orificeQ=lph, mainL=feet, mainD=inch
    var lateralD=lateralD2, lateralL=width2, orificeQ=eFlow2, mainL=height2, mainD=mainD2;
    var wi = lateralL, hi = mainL;
    var g=10, rho=1000, C=150;

    var orificeN = Math.floor(lateralL*12/5.5);
    var lateralQ = orificeN*orificeQ/(60*60);
    //orificeN=wi*2;
    //console.log("orificeN :"+orificeN);
    //console.log("orificeQ :"+orificeQ);
    var lateralN = hi*2;

    mainL = mainL*0.0254*12;
    lateralQ = lateralQ/1000;
    lateralD=lateralD/1000;//*0.0254; //cout << "lateralD :" << lateralD << endl;
    lateralL=lateralL*0.0254*12;
    mainD = mainD/1000;//*0.0254;
    var lateralV = lateralQ*4/(3.14*lateralD*lateralD);
    var F1 = 0.63837*Math.pow(orificeN, -1.8916) + 0.35929;
    var hf = 10.77*lateralL*(Math.pow((lateralQ/C),1.852))*Math.pow(lateralD,-4.865);
    //console.log("lateralQ :" +lateralQ);
    var mainV = lateralQ*lateralN*4/(3.14*mainD*mainD);
    var mainQ = lateralQ*lateralN*1000*60;  // lpm
    console.log("mainQ (lpm):" + mainQ);

    var smallD = lateralD-0.001;

    var squareS=0;
    for(var i=1; i<=orificeN; i++){
        squareS=squareS+Math.pow(i,1.852);
    }
    var F2=squareS/Math.pow(orificeN,2.852);
    //console.log("F2 :" + F2);

    var F3 = Math.pow((1.852+1),-1) + Math.pow(2*orificeN,-1) + Math.pow(1.852-1,0.5)/(6*Math.pow(orificeN,2));
    //console.log("F3 :" + F3);

    var temp1 = Math.max(F1, F2);
    temp1 = Math.max(temp1, F3);

    var  k = 0.056*(Math.pow(lateralD/smallD,17.83)-1);
    var hm =  k*(Math.pow(lateralV,2))/(2*g);

    var pressureChange = (hf+hm*orificeN)*g*rho*0.000145;
    var kineticH = Math.pow(mainV,2)/(2*g);
    console.log("change in pressure caused in lateral (psi): "+ pressureChange);
    //console.log("kineticH :" + kineticH);
    var mainVloss = lateralQ*4/(3.14*mainD*mainD);

    var temp1 = 1000;
    var nameP="";
    var flow = {
        18.9 : "XCZ-075-PRF",
        37.9 : "XCZLF-100-PRF",
        56.8 : "XCZ-100-PRF",
        75.7 : "XCZ-100-PRB-LC",
        151.4 : "XCZ-150-PRB-COM"
    };
    for(var i in flow){
        if(mainQ<=i){
            if(temp1>i){
                nameP=flow[i];
                temp1=i;
            }
        }
    }
    console.log("Pump name: " +nameP );
    console.log("Pump flow: " + temp1);

    var epsi=100;
    var nameMPi="";
    var pipe = {
        0.536:"XFD100",
        0.580:"XT-700-100",
        0.600:"XBS 700 - 1⁄2 Tubing Models - 600-700",
        0.615:"XBS - 1⁄2 Tubing Models",
        0.820:"XBS 940 - 3⁄4 Tubing Models"
    };
    for(var i in pipe){
        if(Math.abs(i-mainD2)<epsi){
            epsi=Math.abs(i-mainD2);
            nameMPi=pipe[i];
            temp1=i;
        }
    }
    console.log("Main pipe: " +nameMPi);
    console.log("Pipe dia :" + temp1);

    epsi=100;
    var nameLPi = "";
    for(var i in pipe){
        if(Math.abs(i-lateralD2)<epsi){
            epsi=Math.abs(i-lateralD2);
            nameLPi=pipe[i];
            temp1=i;
        }
    }
    console.log("Lateral Pipe :" +nameLPi);
    console.log("Pipe dia :" + temp1);

    mainD1=mainD2;
    lateralD1=lateralD2;
    width1=width2;
    height1=height2;
    eFlow1=eFlow2;
    nameP1=nameP;
    nameMPi1=nameMPi;
    nameLPi1=nameLPi;
    pressureChange1=pressureChange;
    mainV1=mainV;
    mainVloss1=mainVloss;

    //console.log("pressureChange :"+pressureChange);
    //console.log("mainV :" + mainV);
    //console.log("mainVloss :"+mainVloss);

    //console.log(nameP+', '+nameMPi+', '+nameLPi);

    socket.emit('showNet');



    //TODO: look on the return statement
    //return main(container, pressureChange, wi, hi, mainV, mainVloss);

}

io.on('connection', function(socket){
    console.log('user Connected');

    socket.on('calculate', function(mainD2, lateralD2, width2, height2, eFlow2){
        //console.log(mainD+','+width);

        return second(mainD2, lateralD2, width2, height2, eFlow2, socket);
        //socket.emit('showNet');
    });

});

http.listen(3000, function(){
    console.log('listening on 3000');
});
