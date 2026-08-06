"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { queryCaged } from "@/actions/query-caged";
import { QueryResults } from "@/components/charts/query-results";
import type { CagedErrorCode } from "@/domain/caged/errors";
import type { CagedQueryResult } from "@/domain/caged/schemas";
import { loadLastQuery, saveLastQuery } from "./last-query-storage";
import { SearchableSelect } from "./searchable-select";

type LocationMode = "COUNTRY" | "STATE" | "CITY";

type OccupationalFamily = {
  familyCode: string;
  familyTitle: string;
};

type City = {
  cityCode: string;
  cityName: string;
};

type State = {
  cities: readonly City[];
  stateCode: string;
  stateName: string;
};

type QueryFormProps = {
  occupationalFamilies: readonly OccupationalFamily[];
  states: readonly State[];
};

type FormError = "incompleteDateRange" | "missingCity" | "missingState";

function monthInputToQueryMonth(value: string): string {
  return value.replace("-", "");
}

function getActionErrorMessage(
  error: CagedErrorCode,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (error) {
    case "invalid_input":
      return t("errorInvalidInput");
    case "invalid_query":
      return t("errorInvalidQuery");
    case "unavailable":
      return t("errorUnavailable");
    case "upstream_contract_error":
    case "upstream_error":
    case "configuration_error":
      return t("errorUnexpected");
  }
}

export function QueryForm({ occupationalFamilies, states }: QueryFormProps) {
  const locale = useLocale();
  const t = useTranslations("QueryForm");
  const [isPending, startTransition] = useTransition();
  const [locationMode, setLocationMode] = useState<LocationMode>("COUNTRY");
  const [stateInput, setStateInput] = useState("");
  const [stateCode, setStateCode] = useState<string>();
  const [cityInput, setCityInput] = useState("");
  const [cityCode, setCityCode] = useState<string>();
  const [professionInput, setProfessionInput] = useState("");
  const [professionCode, setProfessionCode] = useState<string>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [formError, setFormError] = useState<FormError>();
  const [queryData, setQueryData] = useState<CagedQueryResult>();
  const [queryError, setQueryError] = useState<CagedErrorCode>();

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      const lastQuery = loadLastQuery();

      if (lastQuery === undefined) {
        return;
      }

      setLocationMode(lastQuery.locationMode);
      setStateInput(lastQuery.stateInput);
      setStateCode(lastQuery.stateCode);
      setCityInput(lastQuery.cityInput);
      setCityCode(lastQuery.cityCode);
      setProfessionInput(lastQuery.professionInput);
      setProfessionCode(lastQuery.professionCode);
      setFrom(lastQuery.from);
      setTo(lastQuery.to);
      setQueryData(lastQuery.result);
    });

    return () => window.cancelAnimationFrame(restoreFrame);
  }, []);

  const stateOptions = useMemo(
    () => states.map(({ stateCode: value, stateName: label }) => ({ label, value })),
    [states],
  );
  const selectedState = states.find((state) => state.stateCode === stateCode);
  const cityOptions = useMemo(
    () =>
      selectedState?.cities.map(({ cityCode: value, cityName: label }) => ({
        label,
        value,
      })) ?? [],
    [selectedState],
  );
  const professionOptions = useMemo(
    () =>
      occupationalFamilies.map(({ familyCode: value, familyTitle: label }) => ({
        label,
        value,
      })),
    [occupationalFamilies],
  );

  function resetLocationSelection() {
    setStateInput("");
    setStateCode(undefined);
    setCityInput("");
    setCityCode(undefined);
  }

  function changeLocationMode(mode: LocationMode) {
    setLocationMode(mode);
    resetLocationSelection();
    setFormError(undefined);
    setQueryError(undefined);
  }

  function changeState(inputValue: string) {
    setStateInput(inputValue);
    setCityInput("");
    setCityCode(undefined);
  }

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    setQueryError(undefined);

    if (locationMode !== "COUNTRY" && stateCode === undefined) {
      setFormError("missingState");
      return;
    }

    if (locationMode === "CITY" && cityCode === undefined) {
      setFormError("missingCity");
      return;
    }

    if ((from.length === 0) !== (to.length === 0)) {
      setFormError("incompleteDateRange");
      return;
    }

    if (locale !== "pt-BR" && locale !== "en") {
      return;
    }

    const input = {
      locale,
      locationType: locationMode,
      ...(locationMode === "STATE" ? { locationCode: stateCode } : {}),
      ...(locationMode === "CITY" ? { locationCode: cityCode } : {}),
      ...(professionCode === undefined ? {} : { professionCode }),
      ...(from.length === 0 ? {} : { from: monthInputToQueryMonth(from) }),
      ...(to.length === 0 ? {} : { to: monthInputToQueryMonth(to) }),
    };

    startTransition(async () => {
      const result = await queryCaged(input);

      if (!result.ok) {
        setQueryError(result.error);
        return;
      }

      setQueryData(result.data);
      saveLastQuery({
        cityCode,
        cityInput,
        from,
        locationMode,
        professionCode,
        professionInput,
        result: result.data,
        stateCode,
        stateInput,
        to,
        version: 1,
      });
    });
  }

  const queryErrorMessage =
    queryError === undefined ? undefined : getActionErrorMessage(queryError, t);

  return (
    <form className="mt-10 space-y-8" onSubmit={submitQuery}>
      <fieldset>
        <legend className="text-base font-bold text-[var(--foreground)]">{t("locationLegend")}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(["COUNTRY", "STATE", "CITY"] as const).map((mode) => (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm font-semibold text-[var(--foreground)]"
              key={mode}
            >
              <input
                checked={locationMode === mode}
                name="location-mode"
                onChange={() => changeLocationMode(mode)}
                type="radio"
                value={mode}
              />
              {t(`location${mode}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {locationMode !== "COUNTRY" ? (
        <SearchableSelect
          emptyMessage={t("noStates")}
          id="state"
          inputValue={stateInput}
          label={t("stateLabel")}
          onInputValueChange={changeState}
          onSelectionChange={setStateCode}
          options={stateOptions}
          placeholder={t("statePlaceholder")}
        />
      ) : null}

      {locationMode === "CITY" ? (
        <SearchableSelect
          disabled={stateCode === undefined}
          emptyMessage={stateCode === undefined ? t("selectStateFirst") : t("noCities")}
          id="city"
          inputValue={cityInput}
          label={t("cityLabel")}
          onInputValueChange={setCityInput}
          onSelectionChange={setCityCode}
          options={cityOptions}
          placeholder={t("cityPlaceholder")}
        />
      ) : null}

      <SearchableSelect
        emptyMessage={t("noProfessions")}
        id="profession"
        inputValue={professionInput}
        label={t("professionLabel")}
        onInputValueChange={setProfessionInput}
        onSelectionChange={setProfessionCode}
        options={professionOptions}
        placeholder={t("professionPlaceholder")}
      />
      <p className="-mt-6 text-sm text-[var(--muted-foreground)]">{t("professionHelp")}</p>

      <fieldset>
        <legend className="text-base font-bold text-[var(--foreground)]">{t("dateLegend")}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="from">
            {t("fromLabel")}
            <input
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-normal"
              id="from"
              onChange={(event) => setFrom(event.target.value)}
              type="month"
              value={from}
            />
          </label>
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="to">
            {t("toLabel")}
            <input
              className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-normal"
              id="to"
              onChange={(event) => setTo(event.target.value)}
              type="month"
              value={to}
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{t("dateHelp")}</p>
      </fieldset>

      {formError !== undefined ? (
        <p aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t(`validation${formError}`)}
        </p>
      ) : null}
      {queryErrorMessage !== undefined ? (
        <p aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {queryErrorMessage}
        </p>
      ) : null}

      <button
        className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        {isPending ? t("submitPending") : t("submit")}
      </button>

      {queryData !== undefined ? (
        <QueryResults result={queryData} />
      ) : null}
    </form>
  );
}
