"use client";
import * as React from "react";
import Grid from "@mui/joy/Grid";
import S1 from "../components/score/s1";
import S2 from "../components/score/s2";
import S3 from "../components/score/s3";
import S4 from "../components/score/s4";
import Pie from "../components/score/pie";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import Stack from "@mui/joy/Stack";
import { CountUp } from "use-count-up";
import Test from "../test.json";

export default function LinearProgressDeterminate() {
  const sections = Test.sections || [
    { id: "sec1", title: "Section 1", icon: "../1.svg" },
    { id: "sec2", title: "Section 2", icon: "../2.svg" },
    { id: "sec3", title: "Section 3", icon: "../3.svg" },
    { id: "sec4", title: "Section 4", icon: "../4.svg" },
  ];

  const sectionComponents = [<S1 key="s1" />, <S2 key="s2" />, <S3 key="s3" />, <S4 key="s4" />];

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <Sheet
          variant="soft"
          color="neutral"
          sx={{ p: 2, borderRadius: "lg", maxWidth: "300px" }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg">Total Questions:</Typography>
            <Typography level="title-lg">
              <CountUp isCounting end={12} duration={1} />
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg">Total Attempted:</Typography>
            <Typography level="title-lg">
              <CountUp isCounting end={10} duration={1} />
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg" color="success">
              Total Correct:
            </Typography>
            <Typography level="title-lg" color="success">
              <CountUp isCounting end={8} duration={1} />
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg" color="danger">
              Total Incorrect:
            </Typography>
            <Typography level="title-lg" color="danger">
              <CountUp isCounting end={2} duration={1} />
            </Typography>
          </Stack>
        </Sheet>

        <Sheet
          variant="soft"
          color="neutral"
          sx={{ p: 2, borderRadius: "lg", maxWidth: "300px" }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg">Overall Rank:</Typography>
            <Typography level="title-lg">
              <CountUp isCounting end={14} duration={1} />
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg">Total Marks:</Typography>
            <Typography level="title-lg">
              <CountUp isCounting end={8} duration={1} />
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg">Percentage:</Typography>
            <Typography level="title-lg">
              <CountUp isCounting end={67} duration={1} />%
            </Typography>
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={0}
          >
            <Typography level="title-lg">Accuracy:</Typography>
            <Typography level="title-lg">
              <CountUp isCounting end={80} duration={1} />%
            </Typography>
          </Stack>
        </Sheet>

        <Pie />
      </Stack>
      <br />

      <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: "lg" }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          Section-wise Performance (4 Sections)
        </Typography>
        <Grid container spacing={2} sx={{ flexGrow: 1 }}>
          {sections.map((sec, idx) => (
            <React.Fragment key={sec.id || idx}>
              <Grid xs={12} sm={3}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <img
                    src={sec.icon}
                    alt={sec.title}
                    width="28"
                    height="28"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <Typography level="title-md">{sec.title}</Typography>
                </Stack>
              </Grid>
              <Grid xs={12} sm={9}>
                {sectionComponents[idx] || <S1 />}
              </Grid>
            </React.Fragment>
          ))}
        </Grid>
      </Sheet>
    </>
  );
}
