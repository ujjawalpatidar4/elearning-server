// import { instance } from "../index.js";
import { stripe } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import crypto from "crypto";
import { Payment } from "../models/Payment.js";
// import { Progress } from "../models/Progress.js";

export const getAllCourses = TryCatch(async (req, res) => {
    const courses = await Courses.find();
    res.json({
        courses,
    });
});

export const getSingleCourse = TryCatch(async (req, res) => {
    const course = await Courses.findById(req.params.id);

    res.json({
        course,
    });
});

export const fetchLectures = TryCatch(async (req, res) => {
    const lectures = await Lecture.find({ course: req.params.id });

    const user = await User.findById(req.user._id);

    if (user.role === "admin") {
        return res.json({ lectures });
    }

    if (!user.subscription.includes(req.params.id))
        return res.status(400).json({
            message: "You have not subscribed to this course",
        });

    res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
    const lecture = await Lecture.findById(req.params.id);

    const user = await User.findById(req.user._id);

    if (user.role === "admin") {
        return res.json({ lecture });
    }

    if (!user.subscription.includes(lecture.course))
        return res.status(400).json({
            message: "You have not subscribed to this course",
        });

    res.json({ lecture });
});

export const getMyCourses = TryCatch(async (req, res) => {
    const courses = await Courses.find({ _id: req.user.subscription });

    res.json({
        courses,
    });
});

export const checkout = TryCatch(async (req, res) => {
    const user = await User.findById(req.user._id);

    const course = await Courses.findById(req.params.id);

    if (user.subscription.includes(course._id)) {
        return res.status(400).json({
            message: "You already have this course",
        });
    }

    // const options = {
    //     amount: Number(course.price * 100),
    //     currency: "INR",
    // };

    // const order = await stripe.paymentIntents.create(options);

    const amount = Number(course.price * 100);

    const order = await stripe.paymentIntents.create({
        amount: amount,
        currency: "INR",
    });


    res.status(201).json({
        order,
        course,
    });
});

export const paymentVerification = TryCatch(async (req, res) => {
    const { stripe_order_id, stripe_payment_id, stripe_signature } =
        req.body;

    const body = stripe_order_id + "|" + stripe_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", process.env.STRIPE_SECRET_KEY)
        .update(body)
        .digest("hex");

    const isAuthentic = expectedSignature === stripe_signature;

    if (isAuthentic) {
        await Payment.create({
            stripe_order_id,
            stripe_payment_id,
            stripe_signature,
        });

        const user = await User.findById(req.user._id);

        const course = await Courses.findById(req.params.id);

        user.subscription.push(course._id);

        // await Progress.create({
        //     course: course._id,
        //     completedLectures: [],
        //     user: req.user._id,
        // });

        await user.save();

        res.status(200).json({
            message: "Course Purchased Successfully",
        });
    } else {
        return res.status(400).json({
            message: "Payment Failed",
        });
    }
});


export const fakePayment = TryCatch(async (req, res) => {


    const user = await User.findById(req.user._id);

    const course = await Courses.findById(req.params.id);

    user.subscription.push(course._id);

    await user.save();

    res.status(200).json({
        message: "Course Purchased Successfully",
    });

});

// export const paymentVerification = TryCatch(async (req, res) => {
//     const { stripe_payment_id, stripe_signature } = req.body;

//     const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

//     let event;

//     try {
//         event = stripe.webhooks.constructEvent(
//             req.body,
//             stripe_signature,
//             endpointSecret
//         );
//     } catch (err) {
//         return res.status(400).json({
//             message: `Webhook Error: ${err.message}`,
//         });
//     }

//     if (event.type === 'payment_intent.succeeded') {
//         const paymentIntent = event.data.object;

//         // Record the payment in the database
//         await Payment.create({
//             stripe_payment_id: paymentIntent.id,
//             amount: paymentIntent.amount,
//             currency: paymentIntent.currency,
//             status: paymentIntent.status,
//         });

//         // Find the user and course
//         const user = await User.findById(req.user.id); // Assuming req.user.id contains the user ID
//         const course = await Courses.findById(req.params.id);

//         // Add the course to the user's subscription
//         user.subscription.push(course._id);
//         await user.save();

//         res.status(200).json({
//             message: 'Payment verified and course added to subscription successfully',
//         });
//     } else {
//         res.status(400).json({
//             message: 'Payment verification failed',
//         });
//     }
// });

// export const addProgress = TryCatch(async (req, res) => {
//     const progress = await Progress.findOne({
//         user: req.user._id,
//         course: req.query.course,
//     });

//     const { lectureId } = req.query;

//     if (progress.completedLectures.includes(lectureId)) {
//         return res.json({
//             message: "Progress recorded",
//         });
//     }

//     progress.completedLectures.push(lectureId);

//     await progress.save();

//     res.status(201).json({
//         message: "new Progress added",
//     });
// });

// export const getYourProgress = TryCatch(async (req, res) => {
//     const progress = await Progress.find({
//         user: req.user._id,
//         course: req.query.course,
//     });

//     if (!progress) return res.status(404).json({ message: "null" });

//     const allLectures = (await Lecture.find({ course: req.query.course })).length;

//     const completedLectures = progress[0].completedLectures.length;

//     const courseProgressPercentage = (completedLectures * 100) / allLectures;

//     res.json({
//         courseProgressPercentage,
//         completedLectures,
//         allLectures,
//         progress,
//     });
// });