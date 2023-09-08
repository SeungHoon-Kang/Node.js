const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
app.use(bodyParser.urlencoded({extended: true}));
const methondOverride = require('method-override')
app.use(methondOverride('_method'))
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
var flash = require('connect-flash');

require('dotenv').config()


var db;
MongoClient.connect(process.env.DB_URL, {useUnifiedTopology: true}, function (err, client) {
    // db연결되면 할 일
    if (err) return console.log(err);
    db = client.db('todo');
    app.listen(8003, function () {
        console.log('8003 포트를 이용해서 서버 기동중.')
    });

})

app.get('/', function (req, res) {
    res.render('index.ejs');
});

app.get('/write', function (req, res) {
    res.render('write.ejs');
});

app.post('/add', function (req, res) {

    db.collection('counter').findOne({name: '게시물갯수'}, function (err, result) {
        console.log(result.totalPost)
        let Count = result.totalPost;

        db.collection('Post').insertOne({
            _id: Count + 1,
            title: req.body.title,
            contents: req.body.contents,
            date: req.body.date
        }, function () {
            console.log('저장완료');
            // counter라는 콜렉션에 있는 totalPost항목 1 증가
            db.collection('counter').updateOne({name: '게시물갯수'}, {$inc: {totalPost: 1}}, function (err, result) {
                if (err) {
                    return console.log(error)
                }
                ;

            });
            res.send('전송완료');
        });
    });


});


app.get('/list', function (req, res) {
    // 디비에 저장된 Post라는 콜렉션안의 모든 데이터 꺼내기
    db.collection('Post').find().toArray(function (err, result) {
        console.log(result);
        res.render('list.ejs', {posts: result});
    });


});

app.get('/search', (req, res) => {
    db.collection('Post').find({ title: req.query.value }).toArray((err, result) => {
        console.log(result)
        res.render('search.ejs', {posts: result})
    })
})





app.delete('/delete', function (req, res) {
    console.log(req.body);
    req.body._id = parseInt(req.body._id);
    db.collection('Post').deleteOne(req.body, function (err, result) {
        console.log('삭제완료');
        res.status(200).send({message: "성공했습니다."});
    })
 });
app.get('/detail/:id', function (req, res) {

    db.collection('Post').findOne({_id: parseInt(req.params.id)}, function (err, result) {

        if (err) {
            console.error(err);
            res.status(500).send("에러가 발생했습니다.");
        } else if (!result) {
            res.status(404).send("게시글을 찾을수가 없습니다.");
        } else {
            res.render('detail.ejs', {data: result})
        }
    })
})

// :id 파라미터 추가
app.get('/edit/:id', function (req, res) {
    db.collection('Post').findOne({_id: parseInt(req.params.id)}, function (err, result) {
        console.log(result);
        if (err) {
            console.log(err);
            res.status(500).send('에러 발생');
        } else if (!result) {
            res.status(404).send('게시물을 찾을수 없습니다.')
        } else {
            res.render('edit.ejs', {post: result})
        }
    })
})

app.put('/edit', function (req, res) {
    // db저장된 데이터 update하기.
    db.collection('Post').updateOne({_id: parseInt(req.body.id)}, {
        $set: {
            title: req.body.title,
            contents: req.body.contents,
            date: req.body.date
        }
    }, function (err, result) {
        console.log('수정완료')
        res.redirect('/list')
    })
})

app.use(session({secret: 'password', resave: true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());




app.get('/login', function (req, res) {
    res.render('login.ejs')
})

app.post('/login', passport.authenticate('local', {failureRedirect : '/login'}), function(req, res){
    res.redirect('/')
});

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
    session: true,
    passReqToCallback: false,
}, function (Entered_id, Entered_pw, done) {
    //console.log(입력한아이디, 입력한비번);
    db.collection('login').findOne({ id: Entered_id }, function (err, result) {
        if (err) return done(err)

        if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
        if (Entered_pw === result.pw) {
            return done(null, result)
        } else {
            return done(null, false, { message: '비번틀렸어요' })
        }
    })
}));

app.get('/mypage', loginCheck, function (req, res) {
    console.log(req.user);
    res.render('mypage.ejs', {user: req.user})
})

function loginCheck(req, res, next) {
    if (req.user) {
        next()
    } else {
        res.send('로그인안하셨는데요?')
    }
}

app.get('/register', function (req, res) {
    res.render('register.ejs')
});

app.post("/register", function (req, res) {
    db.collection("login").findOne({ id: req.body.id }, function (err, result) {
        if (result == null) {
            db.collection("login").insertOne(
                {
                    id: req.body.id,
                    pw: req.body.pw,
                },
                function (err, result) {
                    res.redirect("/login");
                }
            );
        } else {
            res.send("이미 존재하는 아이디 혹은 비밀번호입니다.");
        }
    });
});

// 세션 저장시키는 코드
    /*
    serializer
    : 입력한 아이디/비번이 db의 값과 맞다면 -> 세션 방식이 적용됨.
    그래서 세션 데이터를 만들어줘야함.(라브가 함)
    그리고 세션 데이터에 세션아이디를 발급해 유저에게 보내야함.
    (i.e. 쿠키로 만들어서 보내주면됨. )
    */
passport.serializeUser(function (user, done) {
    console.log('serializeUser user ==', user)
    done(null, user.id)
});

// 세션 데이터 유무 확인 후, 이 세션 데이터를 가진 회원을 db에서 찾아줌.
passport.deserializeUser(function (id, done) {
    db.collection('login').findOne({id: id}, function (err, result) {
        done(null, result)
        })
    })

